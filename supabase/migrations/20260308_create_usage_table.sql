create table if not exists public.usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  free_sessions_used integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.usage enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'usage' and policyname = 'Users can read own usage'
  ) then
    create policy "Users can read own usage"
      on public.usage for select
      using (auth.uid() = user_id);
  end if;
end $$;
