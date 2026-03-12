do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users can update own posts' and tablename = 'posts'
  ) then
    create policy "Users can update own posts"
      on public.posts for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;
