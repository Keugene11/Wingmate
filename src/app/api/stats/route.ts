import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPro } from "@/lib/subscription";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  if (!(await isPro(userId))) return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });

  const allCheckins = await sql`
    SELECT checked_in_at, talked, opportunities_count, approaches_count, successes_count
    FROM checkins
    WHERE user_id = ${userId}
    ORDER BY checked_in_at DESC
  `;

  const checkins = (allCheckins || []).map((c: any) => ({
    date: c.checked_in_at,
    talked: c.talked,
    opportunities: c.opportunities_count || 0,
    approaches: c.approaches_count || 0,
    successes: c.successes_count || 0,
  }));

  return NextResponse.json({ checkins });
}
