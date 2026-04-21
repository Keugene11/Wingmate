import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { moderateContent } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/ratelimit";

// POST — Add a comment to a post
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await sql`SELECT status FROM subscriptions WHERE user_id = ${session.user.id} AND status IN ('active', 'trialing') LIMIT 1`;
  if (sub.length === 0) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  if (!(await checkRateLimit("community:comment", session.user.id, 30, "1 h"))) {
    return NextResponse.json({ error: "Too many comments — slow down a bit." }, { status: 429 });
  }

  const { id: postId } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const trimmedContent = content.trim().slice(0, 500);

  // Content moderation check
  const check = moderateContent(trimmedContent);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  // Verify post exists
  const posts = await sql`SELECT id FROM posts WHERE id = ${postId}`;
  if (posts.length === 0) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Get username from profile
  const profiles = await sql`
    SELECT username FROM profiles WHERE id = ${session.user.id}
  `;
  const authorName = profiles[0]?.username || "user_" + session.user.id.slice(-6);

  const rows = await sql`
    INSERT INTO comments (post_id, user_id, author_name, body)
    VALUES (${postId}, ${session.user.id}, ${authorName}, ${trimmedContent})
    RETURNING *
  `;

  // Update comment count on the post
  await sql`
    UPDATE posts SET comment_count = (
      SELECT COUNT(*) FROM comments WHERE post_id = ${postId}
    ) WHERE id = ${postId}
  `;

  return NextResponse.json({ comment: rows[0] }, { status: 201 });
}
