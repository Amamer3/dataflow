-- Add missing RLS policies for transactions inserts and updates
-- This patch is safe to run against an existing database.

alter table public.transactions enable row level security;

drop policy if exists txn_insert_own on public.transactions;
drop policy if exists txn_update_own on public.transactions;

create policy txn_insert_own on public.transactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy txn_update_own on public.transactions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
