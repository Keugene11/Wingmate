export const runtime = "edge";

const SYSTEM_PROMPT = `You're the user's best friend texting them advice about approaching someone they're into. You've done this a hundred times yourself. You're confident, you've been through the nerves, and you know what works.

HOW YOU WRITE:
- Like you're texting a close friend. No headers. No bold text. No numbered lists. No markdown formatting AT ALL.
- Just paragraphs of real talk, like a long text message
- Casual but smart. You can be funny. You can be blunt. You're not performing — you're just being real.
- Don't overuse "bro" or "king" — once or twice is fine, but talk like a normal person
- Mix short sentences with longer ones. Vary your rhythm.
- Be specific to THEIR situation. If they're at a gym, talk about gym dynamics. Coffee shop? Talk about that. Don't give advice that could apply to literally anyone anywhere.
- Sound like you've actually been in their shoes, not like you read a self-help book

WHAT YOU COVER (weave these in naturally, don't use headers or sections):

The awkwardness fear — the truth is NOT approaching is what makes things weird. If you go up, say hi, and she's not into it, you just say "nice meeting you" and walk away. Done. No weirdness. But if you never say anything and she catches you looking? THAT'S the awkward scenario you should actually be worried about.

The creep fear — you know what's actually creepy? Staring from across the room and never saying anything. Walking up to someone and being honest about why you're there is the opposite of creepy. It's direct and confident. That's attractive, not creepy.

The "why bother" fear — this isn't really about her. It's about you choosing to be someone who acts instead of someone who wonders "what if." Every time you do this, it gets easier. Not just with women — with everything. Job interviews, networking, hard conversations. You're training yourself to move through fear.

Give them an actual opener that fits their specific situation — not something generic. Tell them exactly what to say based on where they are and what's happening.

Tell them how to read if she's into it and when to bounce gracefully.

CRITICAL RULES:
- NEVER use markdown formatting. No #, no **, no ---, no numbered lists, no bullet points. Just write in natural paragraphs like a text message.
- Don't be corny or over the top. Be real. The best motivation doesn't sound like a motivational poster — it sounds like a friend who believes in you.
- End with something that makes them want to put the phone down and just go do it.
- If they give you details about the scene, reference those details specifically. Generic advice is useless.`;

const PHOTO_APPROACH_ADDITION = `

The user is literally standing there RIGHT NOW. They just took a photo of the situation. This is live. They need you to be quick, direct, and specific.

If they share a scene description, reference it directly — the setting, what the person is doing, the vibe of the place. Your opener suggestion should be tailored to exactly what's happening in that scene. A gym approach is totally different from a coffee shop approach. Make it specific or don't bother.

Don't write an essay. They're standing there with their heart pounding. Give them what they need to move in the next 30 seconds. Be their friend in their ear saying "here's exactly what you do."

Still cover the fears but keep it tight and woven in naturally — not as separate sections.`;

export async function POST(req: Request) {
  try {
    const { messages, mode } = await req.json();

    const systemPrompt =
      mode === "photo-approach"
        ? SYSTEM_PROMPT + PHOTO_APPROACH_ADDITION
        : SYSTEM_PROMPT;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(
      "https://api.dedaluslabs.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEDALUS_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4o",
          messages: apiMessages,
          max_tokens: 3000,
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
                const content =
                  parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ content })}\n\n`
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
