// Creates the wingmate_winback_yearly Stripe price ($19.99/yr) on the
// existing Wingmate product. Idempotent — skips if a price with that
// lookup_key already exists at the right amount.
//
//   pnpm exec node --env-file=.env.local scripts/setup-winback-stripe.mjs

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: false });

const LOOKUP_KEY = "wingmate_winback_yearly";
const AMOUNT = 1999; // $19.99
const INTERVAL = "year";

const found = await stripe.products.search({ query: "metadata['app']:'wingmate'" });
if (found.data.length === 0) throw new Error("No wingmate product found in Stripe — run /api/stripe/setup first");
const product = found.data[0];
console.log(`Product: ${product.id} (${product.name})`);

const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 });
const current = existing.data[0];

if (current?.unit_amount === AMOUNT) {
  console.log(`Price already exists: ${current.id} ($${AMOUNT / 100}/${INTERVAL})`);
} else {
  if (current) console.log(`Existing price ${current.id} at ${current.unit_amount} doesn't match — creating new`);
  const created = await stripe.prices.create({
    product: product.id,
    unit_amount: AMOUNT,
    currency: "usd",
    recurring: { interval: INTERVAL },
    lookup_key: LOOKUP_KEY,
    transfer_lookup_key: true,
  });
  console.log(`Created: ${created.id} ($${AMOUNT / 100}/${INTERVAL}, lookup_key=${LOOKUP_KEY})`);
}
