-- Enable extension if not exists
create extension if not exists "uuid-ossp";

-- Progress table to resume onboarding
create table if not exists public.onboarding_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_step text not null default 'basics',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.onboarding_progress enable row level security;

-- RLS: users can manage their own progress
create policy if not exists "Users can upsert their onboarding progress" on public.onboarding_progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
