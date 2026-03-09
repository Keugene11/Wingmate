-- Add message tracking column to usage table
alter table public.usage add column if not exists free_messages_used integer not null default 0;
