-- PressReady launch schema for subscription status and free-check usage.
-- These tables are accessed only by server routes with SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.subscriptions (
  clerk_user_id text primary key,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_subscription_status text,
  stripe_price_id text,
  stripe_current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create table if not exists public.checks (
  clerk_user_id text primary key,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);
