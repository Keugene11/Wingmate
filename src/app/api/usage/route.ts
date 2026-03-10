import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const FREE_SESSION_LIMIT = 1;
const FREE_MESSAGE_LIMIT = 5;

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSubscription(supabase: any, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .single();
  return data;
}

function usageResponse(usage: { free_sessions_used: number; free_messages_used: number }) {
  const sessionsUsed = usage.free_sessions_used;
  const messagesUsed = usage.free_messages_used;
  return {
    subscribed: false,
    sessionsUsed,
    sessionsRemaining: Math.max(0, FREE_SESSION_LIMIT - sessionsUsed),
    sessionsLimit: FREE_SESSION_LIMIT,
    messagesUsed,
    messagesRemaining: Math.max(0, FREE_MESSAGE_LIMIT - messagesUsed),
    messagesLimit: FREE_MESSAGE_LIMIT,
    limitReached: sessionsUsed >= FREE_SESSION_LIMIT || messagesUsed >= FREE_MESSAGE_LIMIT,
  };
}

// GET: Check usage
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getAdminClient();
    const subscription = await getSubscription(admin, user.id);
    if (subscription) {
      return NextResponse.json({ subscribed: true, sessionsRemaining: -1, messagesRemaining: -1 });
    }

    const { data: usage } = await admin
      .from("usage")
      .select("free_sessions_used, free_messages_used")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json(usageResponse(usage ?? { free_sessions_used: 0, free_messages_used: 0 }));
  } catch {
    return NextResponse.json({ error: "Failed to check usage" }, { status: 500 });
  }
}

// POST: Increment usage. Body: { type: "session" | "message" }
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type = "session" } = await req.json().catch(() => ({ type: "session" }));
    const admin = getAdminClient();

    const subscription = await getSubscription(admin, user.id);
    if (subscription) {
      return NextResponse.json({ subscribed: true });
    }

    const { data: usage } = await admin
      .from("usage")
      .select("free_sessions_used, free_messages_used")
      .eq("user_id", user.id)
      .single();

    if (!usage) {
      // First interaction — create row
      const newRow = {
        user_id: user.id,
        free_sessions_used: type === "session" ? 1 : 0,
        free_messages_used: type === "message" ? 1 : 0,
      };
      await admin.from("usage").insert(newRow);
      return NextResponse.json(usageResponse(newRow));
    }

    // Check limits before incrementing
    if (type === "session" && usage.free_sessions_used >= FREE_SESSION_LIMIT) {
      return NextResponse.json({ ...usageResponse(usage), limitReached: true });
    }
    if (type === "message" && usage.free_messages_used >= FREE_MESSAGE_LIMIT) {
      return NextResponse.json({ ...usageResponse(usage), limitReached: true });
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (type === "session") update.free_sessions_used = usage.free_sessions_used + 1;
    if (type === "message") update.free_messages_used = (usage.free_messages_used ?? 0) + 1;

    await admin.from("usage").update(update).eq("user_id", user.id);

    const updated = {
      free_sessions_used: type === "session" ? usage.free_sessions_used + 1 : usage.free_sessions_used,
      free_messages_used: type === "message" ? (usage.free_messages_used ?? 0) + 1 : (usage.free_messages_used ?? 0),
    };
    return NextResponse.json(usageResponse(updated));
  } catch (e) {
    console.error("Usage error:", e);
    return NextResponse.json({ error: "Failed to update usage" }, { status: 500 });
  }
}
