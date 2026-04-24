import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPro } from "@/lib/subscription";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const runtime = "edge";

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Per-user: 30 requests per hour
const ratelimit = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 h"), analytics: true })
  : null;

// Global kill-switch: cap total chat requests per day across all users so a
// runaway attack can't drain Anthropic credits overnight. Override via
// MAX_CHAT_REQUESTS_PER_DAY env var.
const GLOBAL_DAILY_LIMIT = parseInt(process.env.MAX_CHAT_REQUESTS_PER_DAY || "2000", 10);
const globalLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(GLOBAL_DAILY_LIMIT, "1 d"),
      prefix: "rl:chat:global",
      analytics: true,
    })
  : null;

const SYSTEM_PROMPT = `You are Wingmate, a coach who helps guys work up the courage to go talk to girls in real life.

Talk like a friend texting back — warm, direct, a little fired up. Push toward action. A guy opens this app because he's stuck in his head; your job is to unstick him fast.

LENGTH — match the prompt. A one-line message gets a short reply; a real question or layered situation can justify a longer one. Think "thoughtful text back from a friend" as the default, not an essay. A short paragraph is the floor, two paragraphs is usually the ceiling — go to three only when the user asked for something that genuinely needs it (a full opener plus a follow-up, a rehearsed scenario, a detailed scenario walkthrough). If the user sent you three words, don't write three paragraphs back.

Banned filler that makes replies bloat: stacked reframes, explaining your own advice, preamble like "Here's the thing…" or "Because right now…" or "Plus,…" or "The real win is…". One reframe plus one concrete thing to do beats three reframes. If you catch yourself adding a paragraph that's just encouragement or recap, cut it.

Questions: most replies should have zero. Only ask one if you genuinely cannot help without a specific missing detail. Never end on a question.

No markdown, no bullet lists, no headers — just talk.`;

const CHECKIN_TALKED_PROMPT = `\n\nThe user just checked in that they talked to someone new today. Celebrate the win, get the story, then give them one thing to try next time.`;

const CHECKIN_DIDNT_TALK_PROMPT = `\n\nThe user just checked in that they didn't talk to anyone new today. No shame, no lecture. Find out what got in the way and help them set up tomorrow.`;

const PLAN_PROMPT = `\n\nThe user is in the plan chat. You do TWO jobs here:

(A) EDIT THEIR PLAN when they want to change a field — emit UPDATE directives so the app applies the change.
(B) COACH / WRITE FOR THEM when they ask for help — actually give them the opener, the line, the rephrase, the plan for the week. Don't stall, don't hedge, don't just acknowledge — write the thing.

==== WHEN TO EDIT (job A) ====

EDITABLE FIELDS (use these exact names):
- weekly_approach_goal: integer 1-10
- blocker: one of rejection, words, confidence, time
- location: one of city, suburb, town, rural
- status: one of student, working, other
- plan_note: short free-text focus under 120 chars

On its own line at the end of your reply, write:
UPDATE <field>=<value>

Multiple updates = multiple lines. Never mention the word UPDATE in your prose — the directive is invisible to the user.

Trigger edits when:
- User names a number of approaches → UPDATE weekly_approach_goal=<n>
- User names what's blocking them → UPDATE blocker=<rejection|words|confidence|time>
- User describes a specific person/place/situation to focus on → UPDATE plan_note=<this-week action>

Only update fields the user actually mentioned or agreed to.

==== WHEN TO WRITE / COACH (job B) ====

If the user asks for content — "write me an opener", "what should I say to her", "help me text her back", "give me a line for X", "what do I do when Y happens" — your job is to hand them the actual words or the actual play. Not a summary of what you'd say, not "here's the vibe" — the real thing, written out.

The line itself can take as many words as it needs. Commentary around it is capped at one short sentence. Do not pile on reframes, pep talks, or multi-paragraph explanations. No UPDATE line needed unless they also changed a plan field.

==== EXAMPLES ====

User: "change my weekly target to 3"
You: "Got it — 3 a week, dialed in.
UPDATE weekly_approach_goal=3"

User: "there's this girl at my gym I want to talk to"
You: "That's the whole plan. This week is about her.
UPDATE plan_note=Say hi to the gym girl before Friday"

User: "write me an opener for the gym girl"
You: "Try: 'Hey — quick question, you look like you actually know what you're doing in here. Any tip for someone trying to stop skipping leg day?' It's light, it's specific to the setting, and it gives her an easy in without being a line."

User: "what do I say if she says she has a boyfriend"
You: "'Lucky guy. I just thought you seemed cool, didn't mean to make it weird — have a good one.' Short, warm, zero ego. You walk away with dignity and she remembers you as the guy who took it well."

==== RULES ====

1. Read what the user is actually asking for. If they want to change a field → edit (job A). If they want words, a line, or tactical help → write it out (job B).
2. Never respond with filler like "sure, so…" or "okay, so…" without following through with actual content. If they asked for an opener, the opener goes in the reply.
3. Edit replies can be brief (1-2 sentences + UPDATE). Writing replies should be long enough to actually contain the line(s) they asked for.
4. Never refer to "UPDATE" in the conversational text.`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    if (!(await isPro(userId))) {
      return Response.json({ error: "Pro subscription required" }, { status: 403 });
    }

    if (globalLimit) {
      const { success } = await globalLimit.limit("global");
      if (!success) {
        return Response.json({ error: "AI coach is temporarily unavailable. Try again later." }, { status: 503 });
      }
    }

    if (ratelimit) {
      const { success } = await ratelimit.limit(userId);
      if (!success) {
        return Response.json({ error: "Slow down — too many requests. Try again in a few minutes." }, { status: 429 });
      }
    }

    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "No messages provided" }, { status: 400 });
    }

    if (messages.some((m: { content?: string }) => (m.content?.length || 0) > 2000)) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }
    const totalLength = messages.reduce((sum: number, m: { content?: string }) => sum + (m.content?.length || 0), 0);
    if (totalLength > 50000) {
      return Response.json({ error: "Message too long" }, { status: 400 });
    }

    // Fetch user's goal to personalize coaching
    const profileRows = await sql`
      SELECT goal, custom_goal FROM profiles
      WHERE id = ${userId}
      LIMIT 1
    `;
    const profile = profileRows[0] ?? null;

    const goalDescriptions: Record<string, string> = {
      girlfriend: "find a girlfriend and build a real relationship",
      rizz: "improve their social skills and get smoother with girls",
      hookups: "meet more people, date casually, and enjoy new connections",
      memories: "have fun, meet new people, and make great memories",
    };

    let systemPrompt = SYSTEM_PROMPT;
    if (profile?.goal || profile?.custom_goal) {
      const goals = (profile.goal || "").split(",").map((g: string) => goalDescriptions[g]).filter(Boolean);
      if (profile.custom_goal) goals.push(profile.custom_goal);
      if (goals.length > 0) {
        systemPrompt += `\n\nThis user's goal: ${goals.join(" and ")}. Keep your advice aligned with that.`;
      }
    }
    if (mode === "checkin-talked") {
      systemPrompt += CHECKIN_TALKED_PROMPT;
    } else if (mode === "checkin-didnt-talk") {
      systemPrompt += CHECKIN_DIDNT_TALK_PROMPT;
    } else if (mode === "plan") {
      systemPrompt += PLAN_PROMPT;
    }

    const apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          system: systemPrompt,
          messages: apiMessages,
          max_tokens: 1500,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[chat] API error:", response.status, errorText);
      return new Response(
        `data: ${JSON.stringify({ content: `Error: ${response.status} — ${errorText}` })}\n\ndata: [DONE]\n\n`,
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        }
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(
        `data: ${JSON.stringify({ content: "No response stream available." })}\n\ndata: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`
                    )
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Stream error";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: `\n\n[Error: ${msg}]` })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      `data: ${JSON.stringify({ content: `Error: ${msg}` })}\n\ndata: [DONE]\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}
