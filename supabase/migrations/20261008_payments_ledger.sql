create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  product_type text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'partially_refunded', 'refunded')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
  payment_method_type text,
  provider_customer_id text,
  provider_session_id text unique,
  provider_payment_intent_id text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);
create index if not exists payments_customer_idx
  on public.payments (provider, provider_customer_id)
  where provider_customer_id is not null;

alter table public.payments enable row level security;

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;
grant all on public.payments to service_role;

drop policy if exists "users read own payments" on public.payments;
create policy "users read own payments"
  on public.payments for select to authenticated
  using (auth.uid() = user_id);
