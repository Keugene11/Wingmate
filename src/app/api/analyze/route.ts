export const runtime = "edge";

export async function POST(req: Request) {
  const { imageData, hasCircle } = await req.json();

  const prompt = hasCircle
    ? `You're a scene analyst for a cold approach coach app. The user has taken a photo and marked someone they want to approach.

Describe the scene in detail:
1. What kind of venue/setting is this? (bar, cafe, gym, park, library, club, street, campus, etc.)
2. What's the vibe? (crowded, quiet, energetic, chill, etc.)
3. What is the person of interest doing? (sitting alone, with friends, reading, working out, etc.)
4. Any notable details that could be used in an opener? (what they're drinking, wearing, reading, the music, etc.)

Keep it factual and descriptive, 2-3 sentences. No motivational talk — just describe what you see.`
    : `You're a scene analyst for a cold approach coach app. The user has taken a photo of a social scene.

Describe the scene in detail:
1. What kind of venue/setting is this?
2. What's the vibe?
3. Any notable details useful for approaching someone here?

Keep it factual and descriptive, 2-3 sentences.`;

  try {
    const response = await fetch("https://api.dedaluslabs.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEDALUS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageData },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze] API error:", response.status, errText);
      return Response.json({
        analysis: "",
      });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    return Response.json({ analysis });
  } catch (e) {
    console.error("[analyze] error:", e);
    return Response.json({ analysis: "" });
  }
}
