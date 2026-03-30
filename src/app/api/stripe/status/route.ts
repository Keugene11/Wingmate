import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ subscribed: false, subscription: null });
    }
    const userId = session.user.id;

    const result = await sql`
      SELECT status, price_id, current_period_start, current_period_end, cancel_at_period_end
      FROM subscriptions
      WHERE user_id = ${userId}
        AND status IN ('active', 'trialing')
      LIMIT 1
    `;

    const subscription = result[0] || null;

    return NextResponse.json({
      subscribed: !!subscription,
      subscription,
    });
  } catch {
    return NextResponse.json({ subscribed: false, subscription: null });
  }
}
