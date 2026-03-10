-- Chat history: conversations and messages

create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mode text default 'general',
  preview text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_conversations_user on conversations(user_id, updated_at desc);
alter table conversations enable row level security;
do $$ begin
  create policy "Users see own conversations" on conversations for all using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id, created_at asc);
alter table messages enable row level security;
do $$ begin
  create policy "Users see own messages" on messages for all
    using (conversation_id in (select id from conversations where user_id = auth.uid()));
exception when duplicate_object then null;
end $$;
