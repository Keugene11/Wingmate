# Wingmate

AI-powered confidence coach for cold approaches. Get motivated, get a game plan, and go talk to her.

**[wingmate.live](https://wingmate.live)** · iOS · Android

## What It Does

Wingmate is a mobile-first app that helps guys build the confidence to approach and talk to new people.

- **AI Coach** — Claude-powered chat that hypes you up and gives a tailored game plan: opener, how to read interest, graceful exit.
- **Daily Check-ins** — Track approaches, build streaks, hit weekly goals.
- **Stats** — Calendar heatmap, streaks, approach rate, monthly breakdowns.
- **Community** — Share field reports, upvote, comment.
- **Goal-based coaching** — Pick your goal (girlfriend, social skills, casual dating, etc.) and the AI tailors advice to it.

## Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 16 (App Router) · TypeScript · Tailwind 4 |
| Auth | next-auth (Google + Apple) |
| Database | Neon (Postgres, serverless driver) |
| AI | Claude Haiku 4.5 via Anthropic API |
| Payments | Stripe (web/Android) · RevenueCat IAP (iOS) |
| Rate limiting | Upstash Redis |
| Mobile | Capacitor (iOS + Android) |
| Hosting | Vercel |

Native bundle ID (iOS): `live.wingmate.app` · Android package: `com.approachai.twa`
