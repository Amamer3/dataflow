-- Enums
create type public.network as enum ('MTN', 'TELECEL', 'AIRTELTIGO');
create type public.txn_status as enum ('pending', 'processing', 'success', 'failed', 'refunded');
create type public.txn_type as enum ('data_purchase', 'wallet_topup', 'refund');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Wallets
create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_pesewas bigint not null default 0, -- store as smallest unit (pesewas for GHS)
  currency text not null default 'GHS',
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
-- No insert/update policies: server-only writes via service role.

-- Bundles
create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  network public.network not null,
  name text not null,
  volume_mb integer not null,
  validity_days integer not null default 30,
  price_pesewas bigint not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.bundles enable row level security;
create policy "bundles_select_active" on public.bundles for select to authenticated using (active = true);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.txn_type not null,
  status public.txn_status not null default 'pending',
  amount_pesewas bigint not null,
  currency text not null default 'GHS',
  network public.network,
  bundle_id uuid references public.bundles(id),
  recipient_phone text,
  paystack_reference text unique,
  provider_reference text,
  failure_reason text,
  retry_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "txn_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "txn_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "txn_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- inserts/updates go through server functions (service role), but allow authenticated users to manage their own rows when needed

create index transactions_user_created_idx on public.transactions(user_id, created_at desc);
create index transactions_status_idx on public.transactions(status);

-- Wallet ledger
create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  delta_pesewas bigint not null,
  balance_after_pesewas bigint not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.wallet_ledger enable row level security;
create policy "ledger_select_own" on public.wallet_ledger for select using (auth.uid() = user_id);
create index wallet_ledger_user_idx on public.wallet_ledger(user_id, created_at desc);

-- Auto create profile + wallet on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_transactions before update on public.transactions
  for each row execute function public.touch_updated_at();

-- Seed bundles
insert into public.bundles (network, name, volume_mb, validity_days, price_pesewas, sort_order) values
  ('MTN', '500MB Daily', 500, 1, 300, 1),
  ('MTN', '1GB Daily', 1024, 1, 600, 2),
  ('MTN', '2GB Weekly', 2048, 7, 1500, 3),
  ('MTN', '5GB Monthly', 5120, 30, 3500, 4),
  ('MTN', '10GB Monthly', 10240, 30, 6000, 5),
  ('TELECEL', '500MB Daily', 500, 1, 280, 1),
  ('TELECEL', '1GB Daily', 1024, 1, 550, 2),
  ('TELECEL', '3GB Weekly', 3072, 7, 1700, 3),
  ('TELECEL', '6GB Monthly', 6144, 30, 3800, 4),
  ('TELECEL', '15GB Monthly', 15360, 30, 7500, 5),
  ('AIRTELTIGO', '500MB Daily', 500, 1, 290, 1),
  ('AIRTELTIGO', '1GB Daily', 1024, 1, 580, 2),
  ('AIRTELTIGO', '2.5GB Weekly', 2560, 7, 1600, 3),
  ('AIRTELTIGO', '5GB Monthly', 5120, 30, 3600, 4),
  ('AIRTELTIGO', '10GB Monthly', 10240, 30, 6200, 5);