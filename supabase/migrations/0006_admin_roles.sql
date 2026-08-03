-- ============================================================
-- Focusly — 0006: Roles, Admin & App Configuration
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
--
-- BOOTSTRAP YOUR FIRST ADMIN (run after this migration):
--   update public.profiles set role = 'admin'
--   where email = 'your@email.com';
--
-- Security model:
--   * Role lives ONLY in profiles.role (server-side).
--   * is_admin() is SECURITY DEFINER + search_path pinned, so the client can
--     never spoof an admin role.
--   * RLS: normal users can read only their own profile; only admins can list
--     all users and change roles. Users get NO update on their own profile,
--     which blocks privilege escalation.
-- ============================================================

-- ---------- Add role to profiles ----------
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

-- ---------- is_admin(): server-side role check ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from anon, public;
grant execute on function public.is_admin() to authenticated;

-- ---------- Profiles RLS ----------
-- Existing: users select own profile. Admins additionally read all + manage roles.

drop policy if exists "admins select all profiles" on public.profiles;
create policy "admins select all profiles" on public.profiles
  for select using (is_admin());

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
  for update using (is_admin()) with check (is_admin());

-- Users cannot update their own profile row, so they cannot edit their role
-- (no privilege escalation). Only the admins-manage-profiles policy applies.

-- ---------- App configuration table ----------
create table if not exists public.app_config (
  id bool primary key default true,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "read app config" on public.app_config;
create policy "read app config" on public.app_config
  for select using (true);

drop policy if exists "admin manage app config" on public.app_config;
create policy "admin manage app config" on public.app_config
  for update using (is_admin()) with check (is_admin());

-- Seed a default row (id = true) so reads always succeed.
insert into public.app_config (id, config)
values (true, '{"maintenance": false, "announcement": ""}')
on conflict (id) do nothing;

-- ---------- Auto-updated_at for app_config ----------
drop trigger if exists app_config_updated_at on public.app_config;
create trigger app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

-- ---------- Realtime ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
begin
  alter publication supabase_realtime add table public.app_config;
  exception when duplicate_object then null;
  end;
end $$;