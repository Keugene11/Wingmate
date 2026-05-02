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
    amount: 999, // $9.99
    interval: "month" as const,
    label: "Monthly",
    description: "$9.99/month",
  },
  yearly: {
    lookup_key: "wingmate_yearly",
    amount: 2999, // $29.99/year
    interval: "year" as const,
    label: "Yearly",
    description: "$29.99/year",
  },
  winback_yearly: {
    lookup_key: "wingmate_winback_yearly",
    amount: 1999, // $19.99/year — one-shot win-back offer after paywall cancel
    interval: "year" as const,
    label: "Win-back Yearly",
    description: "$19.99/year",
  },
};
