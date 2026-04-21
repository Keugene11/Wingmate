import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPro } from "@/lib/subscription";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isPro(userId))) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const data = await sql`
    SELECT id, preview, mode, created_at, updated_at
    FROM conversations
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ conversations: data || [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isPro(userId))) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  if (!(await checkRateLimit("conversations:create", userId, 20, "1 h"))) {
    return NextResponse.json({ error: "Too many conversations. Try again later." }, { status: 429 });
  }

  const { mode } = await req.json();

  try {
    const rows = await sql`
      INSERT INTO conversations (user_id, mode)
      VALUES (${userId}, ${mode || "general"})
      RETURNING id
    `;
    return NextResponse.json({ id: rows[0].id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
