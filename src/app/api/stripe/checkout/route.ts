import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICES } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { sql } from "@/lib/db";
import { checkRateLimit } from "@/lib/ratelimit";

async function resolveCustomerId(userId: string, userEmail: string): Promise<string> {
  // 1. Authoritative source: the customer id we already saved for this user.
  const rows = await sql`
    SELECT stripe_customer_id FROM subscriptions WHERE user_id = ${userId} LIMIT 1
  `;
  const stored = rows[0]?.stripe_customer_id;
  if (stored) {
    return stored;
  }

  // 2. Fallback: look up by email, but only reuse if the customer's metadata
  //    confirms it's ours. Prevents account-takeover via a pre-existing Stripe
  //    customer seeded under the victim's email.
  if (userEmail) {
    const existing = await getStripe().customers.list({ email: userEmail, limit: 10 });
    const match = existing.data.find((c) => c.metadata?.supabase_user_id === userId);
    if (match) {
      await persistCustomerId(userId, match.id);
      return match.id;
    }
  }

  // 3. Create fresh customer with metadata anchoring it to our user id.
  const created = await getStripe().customers.create({
    email: userEmail || undefined,
    metadata: { supabase_user_id: userId },
  });
  await persistCustomerId(userId, created.id);
  return created.id;
}

async function persistCustomerId(userId: string, customerId: string) {
  await sql`
    INSERT INTO subscriptions (user_id, stripe_customer_id, status)
    VALUES (${userId}, ${customerId}, 'inactive')
    ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id
  `;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const userEmail = session.user.email || "";

    if (!(await checkRateLimit("stripe:checkout", userId, 10, "1 h"))) {
      return NextResponse.json({ error: "Too many checkout attempts. Try again later." }, { status: 429 });
    }

    const { plan } = await request.json();
    const priceConfig =
      plan === "yearly" ? PRICES.yearly :
      plan === "winback_yearly" ? PRICES.winback_yearly :
      PRICES.monthly;

    const prices = await getStripe().prices.list({
      lookup_keys: [priceConfig.lookup_key],
    });

    if (prices.data.length === 0) {
      return NextResponse.json(
        { error: "Price not found. Run POST /api/stripe/setup first." },
        { status: 400 }
      );
    }

    const customerId = await resolveCustomerId(userId, userEmail);

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // 3-day free trial applies to both yearly plans (regular and win-back).
    const isYearly = plan === "yearly" || plan === "winback_yearly";
    // Win-back cancel returns to the offer page, not the regular paywall —
    // the user has already been told this is their one shot, and bouncing
    // them back to /plans would let them re-trigger the cancel flow.
    const cancelPath = plan === "winback_yearly" ? "/winback-offer?checkout=cancelled" : "/plans?checkout=cancelled";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}${cancelPath}`,
      subscription_data: {
        metadata: { supabase_user_id: userId },
        ...(isYearly && {
          trial_period_days: 3,
          trial_settings: {
            end_behavior: { missing_payment_method: "cancel" },
          },
        }),
      },
      ...(isYearly && { payment_method_collection: "always" }),
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
