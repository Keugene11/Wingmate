import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { sql } from "@/lib/db";

async function upsertSubscription(
  supabaseUserId: string,
  stripeCustomerId: string,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0];

  const currentPeriodStart = item
    ? new Date(item.current_period_start * 1000).toISOString()
    : null;
  const currentPeriodEnd = item
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;
  const priceId = item?.price.id ?? null;
  const now = new Date().toISOString();

  try {
    await sql`
      INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, status,
        price_id, current_period_start, current_period_end,
        cancel_at_period_end, updated_at
      ) VALUES (
        ${supabaseUserId}, ${stripeCustomerId}, ${subscription.id},
        ${subscription.status}, ${priceId}, ${currentPeriodStart},
        ${currentPeriodEnd}, ${subscription.cancel_at_period_end}, ${now}
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
    console.error("Upsert subscription error:", error);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription && session.customer) {
        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        const supabaseUserId =
          subscription.metadata.supabase_user_id ||
          session.metadata?.supabase_user_id;
        if (supabaseUserId) {
          await upsertSubscription(
            supabaseUserId,
            session.customer as string,
            subscription
          );
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const supabaseUserId = subscription.metadata.supabase_user_id;
      if (supabaseUserId) {
        await upsertSubscription(
          supabaseUserId,
          subscription.customer as string,
          subscription
        );
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
