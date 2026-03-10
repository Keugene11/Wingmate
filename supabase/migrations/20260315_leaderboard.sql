-- Weekly leaderboard opt-in and tier tracking
alter table profiles add column if not exists league_opted_in boolean not null default false;
alter table profiles add column if not exists league_tier text not null default 'bronze';
alter table profiles add column if not exists weekly_xp integer not null default 0;
alter table profiles add column if not exists last_league_reset date;

-- Allow reading other profiles for leaderboard (username, xp, tier only)
-- The existing "Users can read any profile" policy already covers this
