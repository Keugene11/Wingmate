import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// POST — Toggle like on a comment. direction: 1 (like) or 0 (remove).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await sql`SELECT status FROM subscriptions WHERE user_id = ${session.user.id} AND status IN ('active', 'trialing') LIMIT 1`;
  if (sub.length === 0) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { id: commentId } = await params;
  const { direction } = await req.json();

  if (![1, 0].includes(direction)) {
    return NextResponse.json({ error: "direction must be 1 or 0" }, { status: 400 });
  }

  const comments = await sql`SELECT id FROM comments WHERE id = ${commentId}`;
  if (comments.length === 0) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  if (direction === 0) {
    await sql`
      DELETE FROM comment_votes WHERE comment_id = ${commentId} AND user_id = ${session.user.id}
    `;
  } else {
    await sql`
      INSERT INTO comment_votes (user_id, comment_id, direction)
      VALUES (${session.user.id}, ${commentId}, 1)
      ON CONFLICT (user_id, comment_id) DO UPDATE SET direction = 1
    `;
  }

  const result = await sql`
    SELECT COALESCE(SUM(direction), 0) AS score FROM comment_votes WHERE comment_id = ${commentId}
  `;
  return NextResponse.json({ score: Number(result[0].score), liked: direction === 1 });
}
