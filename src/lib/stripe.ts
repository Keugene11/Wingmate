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
    amount: 2000, // $20
    interval: "month" as const,
    label: "Monthly",
    description: "$20/month",
  },
  yearly: {
    lookup_key: "wingmate_yearly",
    amount: 18000, // $180/year = $15/month
    interval: "year" as const,
    label: "Yearly",
    description: "$15/month, billed yearly",
  },
};
