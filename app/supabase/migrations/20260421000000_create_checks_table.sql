create extension if not exists pgcrypto;

create table if not exists public.checks (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists checks_clerk_user_id_idx
  on public.checks (clerk_user_id);

create index if not exists checks_created_at_idx
  on public.checks (created_at desc);
