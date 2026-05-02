-- Win-back offer is a one-shot per user: if they bail on the paywall,
-- they get one chance at a discounted yearly. The flag below tracks that
-- we've already burned that chance for this user.
alter table public.profiles
  add column if not exists winback_offer_shown_at timestamptz;
