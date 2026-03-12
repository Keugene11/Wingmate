import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { SupabaseClient } from "@supabase/supabase-js";

async function generateTitle(
  messages: { role: string; content: string }[],
  conversationId: string,
  supabase: SupabaseClient
) {
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

    if (!res.ok) return;
    const data = await res.json();
    const title = data.content?.[0]?.text?.trim();
    if (title) {
      await supabase
        .from("conversations")
        .update({ preview: title.slice(0, 100) })
        .eq("id", conversationId);
    }
  } catch {
    // Silently fail — the fallback preview is already set
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: convo } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: convo } = await supabase
    .from("conversations")
    .select("id, preview")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  // Insert messages
  const rows = messages.map((m: { role: string; content: string }) => ({
    conversation_id: id,
    role: m.role,
    content: m.content,
  }));

  const { error } = await supabase.from("messages").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation preview and timestamp
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  const firstUserMsg = messages.find((m: { role: string }) => m.role === "user");

  if (!convo.preview && firstUserMsg) {
    // Set a temporary preview immediately, then generate AI summary in background
    updates.preview = firstUserMsg.content.slice(0, 100);

    // Generate AI title summary in the background (don't await)
    const allMsgs = messages.filter((m: { role: string; content: string }) => m.content);
    if (allMsgs.length >= 2) {
      generateTitle(allMsgs, id, supabase);
    }
  }

  await supabase.from("conversations").update(updates).eq("id", id);

  return NextResponse.json({ success: true });
}
