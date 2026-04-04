import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// POST — Upsert or remove vote. direction: 1 (like), -1 (dislike), 0 (remove)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await sql`SELECT status FROM subscriptions WHERE user_id = ${session.user.id} AND status IN ('active', 'trialing') LIMIT 1`;
  if (sub.length === 0) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { id: postId } = await params;
  const { direction } = await req.json();

  if (![1, -1, 0].includes(direction)) {
    return NextResponse.json({ error: "direction must be 1, -1, or 0" }, { status: 400 });
  }

  // Verify post exists
  const posts = await sql`SELECT id FROM posts WHERE id = ${postId}`;
  if (posts.length === 0) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (direction === 0) {
    // Remove vote
    await sql`
      DELETE FROM votes WHERE post_id = ${postId} AND user_id = ${session.user.id}
    `;
  } else {
    // Upsert vote
    await sql`
      INSERT INTO votes (user_id, post_id, direction)
      VALUES (${session.user.id}, ${postId}, ${direction})
      ON CONFLICT (user_id, post_id) DO UPDATE SET direction = ${direction}
    `;
  }

  // Recalculate score on the post
  const result = await sql`
    SELECT COALESCE(SUM(direction), 0) AS score FROM votes WHERE post_id = ${postId}
  `;
  const newScore = result[0].score;

  await sql`UPDATE posts SET score = ${newScore} WHERE id = ${postId}`;

  return NextResponse.json({ score: newScore, direction: direction === 0 ? null : direction });
}
