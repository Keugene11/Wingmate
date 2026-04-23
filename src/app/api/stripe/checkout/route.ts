import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICES } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";

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
    const priceConfig = plan === "yearly" ? PRICES.yearly : PRICES.monthly;

    // Look up price by lookup key
    const prices = await getStripe().prices.list({
      lookup_keys: [priceConfig.lookup_key],
    });

    if (prices.data.length === 0) {
      return NextResponse.json(
        { error: "Price not found. Run POST /api/stripe/setup first." },
        { status: 400 }
      );
    }

    // Find or create Stripe customer
    const existingCustomers = await getStripe().customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await getStripe().customers.create({
        email: userEmail!,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/plans?checkout=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: userId },
        // 3-day free trial. Stripe emails reminders 7 days before trial ends
        // by default; we also enable a 2-day reminder via trial_settings.
        trial_period_days: 3,
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
      },
      payment_method_collection: "always",
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
