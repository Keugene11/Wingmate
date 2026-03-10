-- Add XP and streak freezes to profiles
alter table profiles add column if not exists xp integer not null default 0;
alter table profiles add column if not exists streak_freezes integer not null default 0;

-- Badges table
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

alter table user_badges enable row level security;

create policy "Users can read own badges"
  on user_badges for select using (auth.uid() = user_id);

create policy "Users can insert own badges"
  on user_badges for insert with check (auth.uid() = user_id);

create index idx_user_badges_user on user_badges(user_id);

-- Freeze usage tracking on checkins table
alter table checkins add column if not exists freeze_used boolean not null default false;
