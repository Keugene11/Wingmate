import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// GET — Single post + comments + current user's vote
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await sql`SELECT status FROM subscriptions WHERE user_id = ${session.user.id} AND status IN ('active', 'trialing') LIMIT 1`;
  if (sub.length === 0) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const { id } = await params;

  const posts = await sql`
    SELECT * FROM posts WHERE id = ${id}
  `;
  if (posts.length === 0) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comments = await sql`
    SELECT * FROM comments WHERE post_id = ${id} ORDER BY created_at ASC
  `;

  const votes = await sql`
    SELECT direction FROM votes WHERE post_id = ${id} AND user_id = ${session.user.id}
  `;

  // Get current user's profile username
  const profiles = await sql`
    SELECT username FROM profiles WHERE id = ${session.user.id}
  `;
  const username = profiles[0]?.username || "user_" + session.user.id.slice(-6);

  return NextResponse.json({
    post: posts[0],
    comments,
    vote: votes[0]?.direction ?? null,
    username,
  });
}

// PATCH — Edit post (must be owner)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { title, body } = await req.json();

  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  // Verify ownership
  const posts = await sql`
    SELECT user_id FROM posts WHERE id = ${id}
  `;
  if (posts.length === 0) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (posts[0].user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await sql`
    UPDATE posts
    SET title = ${title.trim().slice(0, 120)}, body = ${body.trim().slice(0, 2000)}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json({ post: rows[0] });
}

// DELETE — Delete post (must be owner)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const posts = await sql`
    SELECT user_id FROM posts WHERE id = ${id}
  `;
  if (posts.length === 0) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (posts[0].user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await sql`DELETE FROM posts WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
