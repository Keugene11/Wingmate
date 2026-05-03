// One-shot: applies supabase/migrations/20260502_add_winback_offer.sql
// against the DATABASE_URL in .env.local. Idempotent (add column if not exists).
//
//   pnpm exec node --env-file=.env.local scripts/apply-winback-migration.mjs

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

await sql`
  alter table public.profiles
    add column if not exists winback_offer_shown_at timestamptz
`;

const cols = await sql`
  select column_name, data_type
    from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'winback_offer_shown_at'
`;

console.log("profiles.winback_offer_shown_at:", cols[0] ?? "NOT FOUND");
