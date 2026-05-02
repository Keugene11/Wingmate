import { NextResponse } from "next/server";
import { getStripe, PRICES } from "@/lib/stripe";
import { auth } from "@/lib/auth";

// One-time setup: creates the product and prices in Stripe.
// Admin-only — mutating live Stripe products/prices is destructive, so only
// the account whose email matches ADMIN_EMAIL can trigger it.
async function guard() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await guard();
  return denied ?? setup();
}
export async function POST() {
  const denied = await guard();
  return denied ?? setup();
}

async function setup() {
  try {
    // Check if product already exists by searching
    const existingProducts = await getStripe().products.search({
      query: "metadata['app']:'wingmate'",
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
    } else {
      product = await getStripe().products.create({
        name: "Wingmate Pro",
        description: "AI-powered confidence coach for cold approaches",
        metadata: { app: "wingmate" },
      });
    }

    // Upsert monthly price (transfer_lookup_key moves the key if amount changed)
    const existingMonthly = await getStripe().prices.list({
      lookup_keys: [PRICES.monthly.lookup_key],
    });

    if (existingMonthly.data.length === 0 || existingMonthly.data[0].unit_amount !== PRICES.monthly.amount) {
      await getStripe().prices.create({
        product: product.id,
        unit_amount: PRICES.monthly.amount,
        currency: "usd",
        recurring: { interval: PRICES.monthly.interval },
        lookup_key: PRICES.monthly.lookup_key,
        transfer_lookup_key: true,
      });
    }

    // Upsert yearly price
    const existingYearly = await getStripe().prices.list({
      lookup_keys: [PRICES.yearly.lookup_key],
    });

    if (existingYearly.data.length === 0 || existingYearly.data[0].unit_amount !== PRICES.yearly.amount) {
      await getStripe().prices.create({
        product: product.id,
        unit_amount: PRICES.yearly.amount,
        currency: "usd",
        recurring: { interval: PRICES.yearly.interval },
        lookup_key: PRICES.yearly.lookup_key,
        transfer_lookup_key: true,
      });
    }

    // Upsert win-back yearly price ($19.99) — used by the post-cancel offer flow
    const existingWinback = await getStripe().prices.list({
      lookup_keys: [PRICES.winback_yearly.lookup_key],
    });

    if (existingWinback.data.length === 0 || existingWinback.data[0].unit_amount !== PRICES.winback_yearly.amount) {
      await getStripe().prices.create({
        product: product.id,
        unit_amount: PRICES.winback_yearly.amount,
        currency: "usd",
        recurring: { interval: PRICES.winback_yearly.interval },
        lookup_key: PRICES.winback_yearly.lookup_key,
        transfer_lookup_key: true,
      });
    }

    return NextResponse.json({
      success: true,
      product: product.id,
      message: "Stripe products and prices created successfully",
    });
  } catch (error) {
    console.error("Stripe setup error:", error);
    return NextResponse.json(
      { error: "Failed to set up Stripe" },
      { status: 500 }
    );
  }
}
