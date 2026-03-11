create policy "Users can update own posts"
  on public.posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
