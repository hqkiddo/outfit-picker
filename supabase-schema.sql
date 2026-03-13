-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- Creates the closet_data table for user sync.

create table if not exists closet_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table closet_data enable row level security;

drop policy if exists "Users can read own closet" on closet_data;
create policy "Users can read own closet" on closet_data
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own closet" on closet_data;
create policy "Users can insert own closet" on closet_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own closet" on closet_data;
create policy "Users can update own closet" on closet_data
  for update using (auth.uid() = user_id);
