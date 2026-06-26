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

create or replace function public.pressready_consume_free_check(
  p_clerk_user_id text,
  p_limit integer default 3
)
returns table(allowed boolean, count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.checks (clerk_user_id, count, updated_at)
  values (p_clerk_user_id, 0, now())
  on conflict (clerk_user_id) do nothing;

  select checks.count
    into current_count
    from public.checks
   where checks.clerk_user_id = p_clerk_user_id
   for update;

  if current_count >= p_limit then
    allowed := false;
    count := current_count;
    return next;
    return;
  end if;

  current_count := current_count + 1;

  update public.checks
     set count = current_count,
         updated_at = now()
   where clerk_user_id = p_clerk_user_id;

  allowed := true;
  count := current_count;
  return next;
end;
$$;
