import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// POST — Block a user
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await sql`SELECT status FROM subscriptions WHERE user_id = ${session.user.id} AND status IN ('active', 'trialing') LIMIT 1`;
  if (sub.length === 0) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { blocked_user_id } = await req.json();

  if (!blocked_user_id) {
    return NextResponse.json({ error: "Missing blocked_user_id" }, { status: 400 });
  }

  if (blocked_user_id === session.user.id) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  // Upsert to prevent duplicates
  await sql`
    INSERT INTO blocked_users (blocker_id, blocked_id)
    VALUES (${session.user.id}, ${blocked_user_id})
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE — Unblock a user
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blocked_user_id } = await req.json();

  if (!blocked_user_id) {
    return NextResponse.json({ error: "Missing blocked_user_id" }, { status: 400 });
  }

  await sql`
    DELETE FROM blocked_users
    WHERE blocker_id = ${session.user.id} AND blocked_id = ${blocked_user_id}
  `;

  return NextResponse.json({ ok: true });
}
