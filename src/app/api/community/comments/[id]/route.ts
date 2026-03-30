import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// PATCH — Edit comment (must be owner)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  // Verify ownership
  const comments = await sql`
    SELECT user_id FROM comments WHERE id = ${id}
  `;
  if (comments.length === 0) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  if (comments[0].user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await sql`
    UPDATE comments SET body = ${content.trim().slice(0, 500)}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;

  return NextResponse.json({ comment: rows[0] });
}

// DELETE — Delete comment (must be owner)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership and get post_id for count update
  const comments = await sql`
    SELECT user_id, post_id FROM comments WHERE id = ${id}
  `;
  if (comments.length === 0) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  if (comments[0].user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const postId = comments[0].post_id;

  await sql`DELETE FROM comments WHERE id = ${id}`;

  // Update comment count on the post
  await sql`
    UPDATE posts SET comment_count = (
      SELECT COUNT(*) FROM comments WHERE post_id = ${postId}
    ) WHERE id = ${postId}
  `;

  return NextResponse.json({ ok: true });
}
