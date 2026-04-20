import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

// DELETE — Delete all user data from all tables
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Cancel any active Stripe subscriptions before deleting data
  try {
    const subs = await sql`
      SELECT stripe_customer_id FROM subscriptions
      WHERE user_id = ${userId} AND status = 'active'
    `;
    if (subs.length > 0 && subs[0].stripe_customer_id) {
      const stripe = getStripe();
      const activeStripe = await stripe.subscriptions.list({
        customer: subs[0].stripe_customer_id,
        status: "active",
      });
      for (const sub of activeStripe.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }
  } catch (e) {
    console.error("Failed to cancel Stripe subscription during account deletion:", e);
    // Continue with deletion even if Stripe cancellation fails
  }

  // All child tables reference users(id) ON DELETE CASCADE — one delete handles everything.
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return NextResponse.json({ ok: true });
}
