import { NextResponse } from "next/server";
import { getStripe, PRICES } from "@/lib/stripe";

// One-time setup: creates the product and prices in Stripe
// Call this once via POST /api/stripe/setup
export async function POST() {
  try {
    // Check if product already exists by searching
    const existingProducts = await getStripe().products.search({
      query: "metadata['app']:'approachai'",
    });

    let product;
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
    } else {
      product = await getStripe().products.create({
        name: "ApproachAI Pro",
        description: "AI-powered confidence coach for cold approaches",
        metadata: { app: "approachai" },
      });
    }

    // Create monthly price
    const existingMonthly = await getStripe().prices.list({
      lookup_keys: [PRICES.monthly.lookup_key],
    });

    if (existingMonthly.data.length === 0) {
      await getStripe().prices.create({
        product: product.id,
        unit_amount: PRICES.monthly.amount,
        currency: "usd",
        recurring: { interval: PRICES.monthly.interval },
        lookup_key: PRICES.monthly.lookup_key,
      });
    }

    // Create yearly price
    const existingYearly = await getStripe().prices.list({
      lookup_keys: [PRICES.yearly.lookup_key],
    });

    if (existingYearly.data.length === 0) {
      await getStripe().prices.create({
        product: product.id,
        unit_amount: PRICES.yearly.amount,
        currency: "usd",
        recurring: { interval: PRICES.yearly.interval },
        lookup_key: PRICES.yearly.lookup_key,
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
