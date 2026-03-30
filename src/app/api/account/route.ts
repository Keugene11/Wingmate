import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

// DELETE — Delete all user data from all tables
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Delete in dependency order (children before parents)
  await sql`DELETE FROM comments WHERE user_id = ${userId}`;
  await sql`DELETE FROM votes WHERE user_id = ${userId}`;
  await sql`DELETE FROM posts WHERE user_id = ${userId}`;
  await sql`DELETE FROM checkins WHERE user_id = ${userId}`;
  await sql`DELETE FROM messages WHERE user_id = ${userId}`;
  await sql`DELETE FROM conversations WHERE user_id = ${userId}`;
  await sql`DELETE FROM usage WHERE user_id = ${userId}`;
  await sql`DELETE FROM subscriptions WHERE user_id = ${userId}`;
  await sql`DELETE FROM user_badges WHERE user_id = ${userId}`;
  await sql`DELETE FROM profiles WHERE id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return NextResponse.json({ ok: true });
}
