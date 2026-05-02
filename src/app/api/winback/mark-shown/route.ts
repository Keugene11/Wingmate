import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

// Burns the user's one-shot win-back chance. Called by /spin on mount so
// that refreshing the page or revisiting the URL can't re-trigger the offer.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await sql`
    UPDATE profiles
       SET winback_offer_shown_at = COALESCE(winback_offer_shown_at, now())
     WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true });
}
