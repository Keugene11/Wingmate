import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// POST — Report a post or comment
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await sql`SELECT status FROM subscriptions WHERE user_id = ${session.user.id} AND status IN ('active', 'trialing') LIMIT 1`;
  if (sub.length === 0) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { target_type, target_id, reason } = await req.json();

  if (!target_type || !target_id || !reason?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["post", "comment"].includes(target_type)) {
    return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
  }

  const trimmedReason = reason.trim().slice(0, 500);

  // Prevent duplicate reports
  const existing = await sql`
    SELECT id FROM reports
    WHERE reporter_id = ${session.user.id}
      AND target_type = ${target_type}
      AND target_id = ${target_id}
  `;
  if (existing.length > 0) {
    return NextResponse.json({ error: "You have already reported this content" }, { status: 409 });
  }

  // Get the author of the reported content
  let targetUserId = null;
  if (target_type === "post") {
    const rows = await sql`SELECT user_id FROM posts WHERE id = ${target_id}`;
    targetUserId = rows[0]?.user_id;
  } else {
    const rows = await sql`SELECT user_id FROM comments WHERE id = ${target_id}`;
    targetUserId = rows[0]?.user_id;
  }

  await sql`
    INSERT INTO reports (reporter_id, target_type, target_id, target_user_id, reason)
    VALUES (${session.user.id}, ${target_type}, ${target_id}, ${targetUserId}, ${trimmedReason})
  `;

  return NextResponse.json({ ok: true }, { status: 201 });
}
