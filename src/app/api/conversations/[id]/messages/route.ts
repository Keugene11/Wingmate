import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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
  const firstUserMsg = messages.find((m: { role: string }) => m.role === "user");
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (!convo.preview && firstUserMsg) {
    updates.preview = firstUserMsg.content.slice(0, 100);
  }

  await supabase.from("conversations").update(updates).eq("id", id);

  return NextResponse.json({ success: true });
}
