import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * RevenueCat webhook handler.
 * Syncs Apple IAP subscription status to the subscriptions table.
 *
 * Configure in RevenueCat dashboard:
 *   URL: https://wingmate.live/api/webhooks/revenuecat
 *   Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
 */
export async function POST(request: NextRequest) {
  // Verify webhook authorization
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.REVENUECAT_WEBHOOK_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const event = body.event;

  if (!event) {
    return NextResponse.json({ error: "No event" }, { status: 400 });
  }

  const appUserId = event.app_user_id;
  // RevenueCat app_user_id should be set to Supabase user ID via logIn()
  if (!appUserId || appUserId.startsWith("$RCAnonymousID")) {
    // Anonymous user — can't link to Supabase
    return NextResponse.json({ received: true });
  }

  // Map RevenueCat event types to subscription status
  const eventType = event.type as string;
  let status: string;

  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
      status = "active";
      break;
    case "CANCELLATION":
    case "EXPIRATION":
      status = "canceled";
      break;
    case "BILLING_ISSUE":
      status = "past_due";
      break;
    default:
      // Other events (PRODUCT_CHANGE, SUBSCRIBER_ALIAS, etc.)
      return NextResponse.json({ received: true });
  }

  const expirationDate = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;
  const purchaseDate = event.purchased_at_ms
    ? new Date(event.purchased_at_ms).toISOString()
    : null;

  const stripeCustomerId = `rc_${appUserId}`;
  const stripeSubscriptionId = `rc_${event.original_transaction_id || event.transaction_id || "unknown"}`;
  const priceId = event.product_id || null;
  const cancelAtPeriodEnd = eventType === "CANCELLATION";
  const now = new Date().toISOString();

  try {
    await sql`
      INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, status,
        price_id, current_period_start, current_period_end,
        cancel_at_period_end, updated_at
      ) VALUES (
        ${appUserId}, ${stripeCustomerId}, ${stripeSubscriptionId},
        ${status}, ${priceId}, ${purchaseDate},
        ${expirationDate}, ${cancelAtPeriodEnd}, ${now}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        status = EXCLUDED.status,
        price_id = EXCLUDED.price_id,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        updated_at = EXCLUDED.updated_at
    `;
  } catch (error) {
    console.error("RevenueCat webhook upsert error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
