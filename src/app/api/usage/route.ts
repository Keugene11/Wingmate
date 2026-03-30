import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

const FREE_SESSION_LIMIT = 1;
const FREE_MESSAGE_LIMIT = 1;

async function getSubscription(userId: string) {
  const rows = await sql`
    SELECT status FROM subscriptions
    WHERE user_id = ${userId} AND status IN ('active', 'trialing')
    LIMIT 1
  `;
  return rows[0] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function usageResponse(usage: any) {
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
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const subscription = await getSubscription(userId);
    if (subscription) {
      return NextResponse.json({ subscribed: true, sessionsRemaining: -1, messagesRemaining: -1 });
    }

    const usageRows = await sql`
      SELECT free_sessions_used, free_messages_used FROM usage
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const usage = usageRows[0] ?? null;

    return NextResponse.json(usageResponse(usage ?? { free_sessions_used: 0, free_messages_used: 0 }));
  } catch {
    return NextResponse.json({ error: "Failed to check usage" }, { status: 500 });
  }
}

// POST: Increment usage. Body: { type: "session" | "message" }
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { type = "session" } = await req.json().catch(() => ({ type: "session" }));

    const subscription = await getSubscription(userId);
    if (subscription) {
      return NextResponse.json({ subscribed: true });
    }

    const usageRows = await sql`
      SELECT free_sessions_used, free_messages_used FROM usage
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const usage = usageRows[0] ?? null;

    if (!usage) {
      // First interaction — create row
      const newRow = {
        free_sessions_used: type === "session" ? 1 : 0,
        free_messages_used: type === "message" ? 1 : 0,
      };
      await sql`
        INSERT INTO usage (user_id, free_sessions_used, free_messages_used)
        VALUES (${userId}, ${newRow.free_sessions_used}, ${newRow.free_messages_used})
      `;
      return NextResponse.json(usageResponse(newRow));
    }

    // Check limits before incrementing
    if (type === "session" && usage.free_sessions_used >= FREE_SESSION_LIMIT) {
      return NextResponse.json({ ...usageResponse(usage), limitReached: true });
    }
    if (type === "message" && usage.free_messages_used >= FREE_MESSAGE_LIMIT) {
      return NextResponse.json({ ...usageResponse(usage), limitReached: true });
    }

    if (type === "session") {
      await sql`
        UPDATE usage SET free_sessions_used = free_sessions_used + 1, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }
    if (type === "message") {
      await sql`
        UPDATE usage SET free_messages_used = COALESCE(free_messages_used, 0) + 1, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    }

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
