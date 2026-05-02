-- Add role-based access control to profiles
-- This migration adds a role column to support admin functionality

alter table public.profiles add column if not exists role text check (role in ('user', 'admin', 'super_admin', 'suspended')) default 'user';

-- Create admin user function (call this manually to create admin users)
create or replace function public.make_user_admin(user_email text, admin_role text default 'admin')
returns void
language plpgsql
security definer
as $$
declare
  user_id uuid;
begin
  -- Get user ID from auth.users
  select id into user_id from auth.users where email = user_email;

  if user_id is null then
    raise exception 'User with email % not found', user_email;
  end if;

  -- Update profile role
  update public.profiles
  set role = admin_role, updated_at = now()
  where id = user_id;

  -- Insert profile if it doesn't exist
  if not found then
    insert into public.profiles (id, role, created_at, updated_at)
    values (user_id, admin_role, now(), now());
  end if;
end;
$$;

-- Grant execute permission to service role only
revoke execute on function public.make_user_admin(text, text) from public, anon, authenticated;

-- Add RLS policies for admin access
drop policy if exists admin_select_profiles on public.profiles;
create policy admin_select_profiles on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id or
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

drop policy if exists admin_update_profiles on public.profiles;
create policy admin_update_profiles on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- Create audit log table for admin actions
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete cascade,
  action text not null,
  resource_type text not null,
  resource_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

-- Only admins can view audit logs
create policy admin_select_audit_log on public.admin_audit_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'super_admin')
    )
  );

-- Function to log admin actions
create or replace function public.log_admin_action(
  action_name text,
  resource_type_name text,
  resource_id_value text default null,
  action_details jsonb default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.admin_audit_log (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  ) values (
    auth.uid(),
    action_name,
    resource_type_name,
    resource_id_value,
    action_details
  );
end;
$$;

revoke execute on function public.log_admin_action(text, text, text, jsonb) from public, anon, authenticated;