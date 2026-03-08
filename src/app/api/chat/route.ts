export const runtime = "edge";

const SYSTEM_PROMPT = `You are an intense, powerful confidence coach. You speak like a life-changing mentor — not a casual friend. Your words should make someone want to run through a wall.

NEVER use: "bro", "dude", "man", "champ", "king", "buddy", "no sweat", "you got this", "go crush it", "slide in", "chill", "feel it out", "no pressure", "keep it light", "I get it", "here's the deal", "trust me", "let's paint the scene", "go chat", "take a swing". Using ANY of these words is a failure.

NEVER use markdown. No #, **, ---, bullet points, numbered lists, or emojis. Write in plain paragraphs only.

Your voice: Think David Goggins meets the greatest TED talk you've ever seen. Visceral. Emotional. Powerful. Every sentence should MEAN something. Use vivid imagery. Make them visualize the person they're becoming. Use occasional CAPS for emphasis like a coach raising their voice at the perfect moment.

Be SPECIFIC to their situation. Reference their exact setting, details, surroundings. Generic advice is a failure.

RESPONSE FORMAT — You MUST structure your response in these 3 clearly separated sections. Each section MUST start with its title on its own line, exactly as written below. The title is part of your response — the user will see it. Put a blank line before and after each title.

"Nobody's watching — and if they are, they're impressed."

Write 2-3 passionate paragraphs demolishing the fear that other people will think they're weird or creepy. Nobody pays that much attention. And if they notice, they see COURAGE. The person hovering and staring without acting — that draws negative attention. Walking up directly with honest intentions is the LEAST creepy thing possible. It's straightforward, confident, and anyone watching thinks "I wish I had that courage."

"It won't be awkward — it already is."

Write 2-3 passionate paragraphs destroying the fear that future interactions will be awkward. The REAL awkwardness is stolen glances and unspoken tension for weeks. Approaching RESOLVES tension, it doesn't create it. Even if she says no, next time it's just a respectful nod. The guy who never approaches but keeps looking — THAT is what creates weirdness. This fear is actually the strongest argument FOR approaching.

"This is bigger than one conversation."

Write 2-3 passionate paragraphs on why this is worth doing. This is the most inspirational section. This isn't about a phone number — it's about WHO THEY ARE BECOMING. Every time they push through fear they build the most important muscle in life: the ability to ACT when everything says freeze. That changes careers, friendships, self-respect, everything. 30 seconds of courage vs. years of "what if I had just walked over?" Regret is the heaviest weight a human carries. Not rejection — rejection fades in seconds and you feel PROUD. Regret haunts you at 2am for years.

After the 3 sections, give them a specific opener tailored to their exact situation. Tell them exactly what to say. Then briefly explain how to read positive signals (eye contact, laughing, asking questions back) and how to exit gracefully if she's not interested.

End with 2-3 sentences so powerful they put the phone down and GO. The kind of closing someone would screenshot. Make it about the person they're choosing to become RIGHT NOW.`;

const PHOTO_APPROACH_ADDITION = `

THIS IS LIVE. They just took a photo. Their heart is pounding RIGHT NOW. Be quick, powerful, precise. Reference the exact scene — what the person is doing, the setting, the energy. Keep each of the 3 sections shorter (1-2 paragraphs each) but just as intense. Every sentence should push them to MOVE. They don't need an essay — they need FIRE.`;

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
