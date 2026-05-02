import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isPro } from "@/lib/subscription";

// One-shot win-back: eligible iff (a) signed in, (b) not already Pro,
// (c) we haven't shown them the offer before. Anonymous users skip the
// flow entirely — without an account we can't enforce the one-shot rule.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ eligible: false, reason: "unauthenticated" });
  }
  const userId = session.user.id;

  if (await isPro(userId)) {
    return NextResponse.json({ eligible: false, reason: "already_pro" });
  }

  const rows = await sql`
    SELECT winback_offer_shown_at FROM profiles WHERE id = ${userId} LIMIT 1
  `;
  if (rows[0]?.winback_offer_shown_at) {
    return NextResponse.json({ eligible: false, reason: "already_shown" });
  }

  return NextResponse.json({ eligible: true });
}
