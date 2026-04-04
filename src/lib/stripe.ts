import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
  }
  return _stripe;
}

export const PRICES = {
  monthly: {
    lookup_key: "wingmate_monthly",
    amount: 1000, // $10
    interval: "month" as const,
    label: "Monthly",
    description: "$10/month",
  },
  yearly: {
    lookup_key: "wingmate_yearly",
    amount: 5000, // $50/year
    interval: "year" as const,
    label: "Yearly",
    description: "$50/year",
  },
};
