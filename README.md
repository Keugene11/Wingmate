# Wingmate

AI-powered confidence coach for cold approaches. Snap a photo, get scene analysis, and receive real-time coaching to help you make your move.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + Bricolage Grotesque
- **Auth:** Supabase Auth (Google OAuth)
- **AI:** Claude Sonnet via Dedalus Labs API
- **Payments:** Stripe (subscriptions)
- **Deployment:** Vercel

## Features

- **Photo analysis** — Take or upload a photo, annotate the scene, get AI-powered situational awareness
- **Chat coaching** — Streaming AI coach that gives you confidence and a game plan
- **Subscription gating** — $15/month or $10/month (billed yearly at $120)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/          # Photo scene analysis
│   │   ├── chat/             # Streaming chat endpoint
│   │   ├── stripe/           # Checkout, portal, status, setup
│   │   └── webhooks/stripe/  # Stripe webhook handler
│   ├── auth/callback/        # OAuth callback
│   ├── login/                # Google OAuth login
│   └── pricing/              # Subscription pricing page
├── components/
│   ├── ChatCoach.tsx         # Chat interface
│   └── ImageAnnotator.tsx    # Photo annotation canvas
├── lib/
│   ├── ai.ts                # AI provider config
│   ├── stripe.ts            # Stripe client + price config
│   ├── subscription.ts      # Subscription check helper
│   ├── supabase-browser.ts  # Browser Supabase client
│   └── supabase-server.ts   # Server Supabase client
└── middleware.ts             # Auth + subscription gating
```

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Copy `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEDALUS_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### 3. Database

Run `supabase-schema.sql` in your Supabase SQL editor to create the `subscriptions` table.

### 4. Stripe products

After adding your Stripe key, create products and prices by calling:

```bash
curl -X POST http://localhost:3000/api/stripe/setup
```

This creates a "Wingmate Pro" product with monthly ($15) and yearly ($120) prices.

### 5. Stripe webhook

Point your Stripe webhook to `https://yourdomain.com/api/webhooks/stripe` with events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 6. Run

```bash
pnpm dev
```

## Pricing

| Plan    | Price      | Billing        |
|---------|------------|----------------|
| Monthly | $15/month  | Billed monthly |
| Yearly  | $10/month  | $120/year      |
