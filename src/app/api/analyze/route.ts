import { createServerClient } from "@supabase/ssr";

export const runtime = "edge";

async function getUser(req: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get("cookie") || "";
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          }).filter((c) => c.name);
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageData } = await req.json();

  if (!imageData) {
    return Response.json({ analysis: "" });
  }

  const apiKey = process.env.DEDALUS_API_KEY;
  if (!apiKey) {
    return Response.json({ analysis: "" });
  }

  const prompt = `Describe this photo in detail for someone who needs to approach a person in this scene. Include:

1. The exact setting — is this a gym, coffee shop, bar, park, library, street, etc.? Describe the space.
2. What is the person of interest doing? Are they sitting, standing, working out, reading, on their phone, talking to someone?
3. What is the vibe/energy of the place? Busy, quiet, chill, loud?
4. Any specific details that could be used as conversation starters — what equipment they're using, what they're wearing, what's around them, what they're drinking/reading, etc.
5. Are they alone or with friends? Do they seem relaxed or busy?

Be specific and vivid. This description will be used to give tailored approach advice.`;

  try {
    const response = await fetch("https://api.dedaluslabs.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
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
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze] API error:", response.status, errText);
      return Response.json({ analysis: "" });
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    return Response.json({ analysis });
  } catch (e: unknown) {
    console.error("[analyze] error:", e);
    return Response.json({ analysis: "" });
  }
}
