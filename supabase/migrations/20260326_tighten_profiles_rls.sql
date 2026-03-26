-- Tighten RLS on profiles table: only authenticated users can read profiles
-- Previously the profiles table was readable by anon role (anyone with the anon key)

-- Drop any existing SELECT policies on profiles that allow anon access
drop policy if exists "Profiles are viewable by everyone" on profiles;
drop policy if exists "profiles_select" on profiles;
drop policy if exists "Anyone can view profiles" on profiles;
drop policy if exists "Public profiles are viewable by everyone." on profiles;

-- Create a new SELECT policy: only authenticated users can read profiles
drop policy if exists "Authenticated users can view profiles" on profiles;
create policy "Authenticated users can view profiles"
  on profiles for select
  to authenticated
  using (true);

-- Ensure users can still read their own profile (redundant with above but explicit)
-- and update their own profile
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Ensure insert policy exists for new user creation
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Also allow the service role trigger to insert (handle_new_user runs as security definer)
-- This is already covered by security definer but being explicit
