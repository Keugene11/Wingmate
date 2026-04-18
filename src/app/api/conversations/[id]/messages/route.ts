import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPro } from "@/lib/subscription";

async function generateTitle(
  messages: { role: string; content: string }[]
): Promise<string | null> {
  try {
    const snippet = messages
      .slice(0, 4)
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        system: "Generate a short title (max 6 words) summarizing this cold approach coaching conversation. Be specific to the situation. Examples: \"Nervous about gym crush\", \"Girl at coffee shop\", \"Party approach anxiety\". Return ONLY the title, nothing else.",
        messages: [{ role: "user", content: snippet }],
        max_tokens: 30,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const title = data.content?.[0]?.text?.trim();
    return title ? title.slice(0, 100) : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isPro(userId))) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  // Verify ownership
  const convoRows = await sql`
    SELECT id FROM conversations WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  if (!convoRows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = await sql`
    SELECT role, content FROM messages
    WHERE conversation_id = ${id}
    ORDER BY created_at ASC
  `;

  return NextResponse.json({ messages: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isPro(userId))) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  // Verify ownership
  const convoRows = await sql`
    SELECT id, preview FROM conversations WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  const convo = convoRows[0];
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  // Insert messages
  for (const m of messages as { role: string; content: string }[]) {
    await sql`
      INSERT INTO messages (conversation_id, role, content)
      VALUES (${id}, ${m.role}, ${m.content})
    `;
  }

  // Update conversation preview and timestamp
  const firstUserMsg = messages.find((m: { role: string }) => m.role === "user");

  if (!convo.preview && firstUserMsg) {
    // Try to generate AI title, fall back to first message
    const allMsgs = messages.filter((m: { role: string; content: string }) => m.content);
    let preview: string;
    if (allMsgs.length >= 2) {
      const title = await generateTitle(allMsgs);
      preview = title || firstUserMsg.content.slice(0, 100);
    } else {
      preview = firstUserMsg.content.slice(0, 100);
    }
    await sql`
      UPDATE conversations SET updated_at = now(), preview = ${preview} WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE conversations SET updated_at = now() WHERE id = ${id}
    `;
  }

  return NextResponse.json({ success: true });
}
