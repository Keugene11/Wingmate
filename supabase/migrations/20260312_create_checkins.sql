-- Daily check-ins table
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  talked boolean not null,
  note text,
  checked_in_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique(user_id, checked_in_at)
);

-- RLS
alter table checkins enable row level security;

create policy "Users can read own checkins"
  on checkins for select using (auth.uid() = user_id);

create policy "Users can insert own checkins"
  on checkins for insert with check (auth.uid() = user_id);

-- Index for streak queries
create index idx_checkins_user_date on checkins(user_id, checked_in_at desc);
