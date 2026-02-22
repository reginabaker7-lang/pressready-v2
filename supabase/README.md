# Supabase schema for PressReady subscriptions

Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.subscriptions (
  id bigserial primary key,
  user_id text not null unique,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_subscription_idx on public.subscriptions (stripe_subscription_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- Optional: store generated reports by authenticated user.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists reports_user_id_idx on public.reports (user_id);
```
