import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function upsertSubscription(
  supabaseUserId: string,
  stripeCustomerId: string,
  subscription: Stripe.Subscription
) {
  const supabase = getAdminClient();

  const item = subscription.items.data[0];

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: supabaseUserId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price.id,
      current_period_start: item
        ? new Date(item.current_period_start * 1000).toISOString()
        : null,
      current_period_end: item
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) console.error("Upsert subscription error:", error);
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
