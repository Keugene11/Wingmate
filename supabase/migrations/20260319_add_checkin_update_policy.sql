-- Allow users to update their own checkins (required for editing daily stats)
do $$ begin
  create policy "Users can update own checkins"
    on checkins for update using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
