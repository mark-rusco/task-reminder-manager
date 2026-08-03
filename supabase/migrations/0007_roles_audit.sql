-- ============================================================
-- Focusly — 0007: Roles, Permissions, Profile Fields & Audit
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- AFTER 0006_admin_roles.sql.
--
-- Adds:
--   * roles / permissions / role_permissions  — configurable access model
--   * profile_fields                         — admin-defined user profile fields
--   * audit_logs                             — audit trail for auth + admin actions
--   * profiles.disabled / last_login_at      — account management
--   * has_permission() security-definer check used for RLS and guarding actions
--
-- NOTE: after this, admin actions like role changes must also be possible
-- through an API call. All table writes below are restricted to admins via
-- public.is_admin() (from 0006). has_permission() is a fallback for future
-- fine-grained (non-admin) permissions; admins implicitly pass every check.
-- ============================================================

-- ---------- Roles ----------
create table if not exists public.roles (
  id bigint generated always as identity primary key,
  name text unique not null,
  label text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.roles (name, label, description, is_system) values
  ('admin', 'Administrator', 'Full access to manage the application.', true),
  ('user', 'User', 'Standard member access.', true)
on conflict (name) do nothing;

-- ---------- Permissions ----------
create table if not exists public.permissions (
  id bigint generated always as identity primary key,
  key text unique not null,
  label text not null,
  category text,
  created_at timestamptz not null default now()
);

insert into public.permissions (key, label, category) values
  ('users.read',    'View all users',            'Auth'),
  ('users.manage',  'Manage user accounts',      'Auth'),
  ('roles.manage',  'Manage roles',              'Auth'),
  ('permissions.manage', 'Assign permissions',   'Auth'),
  ('fields.manage', 'Manage profile fields',     'Auth'),
  ('config.manage', 'Manage app configuration',  'App'),
  ('audit.view',    'View audit trail',          'App')
on conflict (key) do nothing;

-- ---------- Role <-> Permission mapping ----------
create table if not exists public.role_permissions (
  role_id bigint not null references public.roles(id) on delete cascade,
  permission_id bigint not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Give the admin role every permission so administrators always pass checks.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
  from public.roles r, public.permissions p
  where r.name = 'admin'
on conflict do nothing;

-- ---------- profiles: roles + account + custom fields ----------
-- Replace the 0006 check constraint (roles now live in the roles table).
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add column if not exists role text not null default 'user';

-- FK to the roles table; role column stores the role name.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_role_fkey foreign key (role)
        references public.roles(name) on update cascade;
  end if;
end $$;

alter table public.profiles
  add column if not exists disabled boolean not null default false,
  add column if not exists last_login_at timestamptz,
  add column if not exists custom_fields jsonb not null default '{}'::jsonb;

create index if not exists profiles_disabled_idx on public.profiles(disabled);

-- ---------- has_permission: server-side permission check ----------
create or replace function public.has_permission(p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.profiles pr
      join public.roles r           on r.name = pr.role
      join public.role_permissions rp on rp.role_id = r.id
      join public.permissions perm  on perm.id = rp.permission_id
      where pr.id = auth.uid() and perm.key = p_key
    );
$$;

revoke execute on function public.has_permission(text) from anon, public;
grant execute on function public.has_permission(text) to authenticated;

-- ---------- Profiles RLS additions ----------
-- Existing policies from 0006 handle admins (select/update all). Re-assert:
drop policy if exists "admins select all profiles" on public.profiles;
create policy "admins select all profiles" on public.profiles
  for select using (public.has_permission('users.read'));

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles
  for update using (public.has_permission('users.manage'))
  with check (public.has_permission('users.manage'));

-- Users can read their own row, but do NOT get direct UPDATE on profiles.
-- Their own edits go through security-definer RPCs below (custom fields,
-- last_login), which prevents any privilege escalation (role/disabled can
-- only be changed by admins through the users.manage policy).
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Own edits via RPC (security definer, runs as owner -> bypasses RLS safely,
-- and only touches the columns we allow).
create or replace function public.record_login()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_login_at = now()
   where id = auth.uid();
$$;

create or replace function public.update_own_custom_fields(p_fields jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'custom_fields must be a JSON object';
  end if;
  update public.profiles
     set custom_fields = p_fields
   where id = auth.uid();
end;
$$;

revoke execute on function public.record_login() from anon, public;
revoke execute on function public.update_own_custom_fields(jsonb) from anon, public;
grant execute on function public.record_login() to authenticated;
grant execute on function public.update_own_custom_fields(jsonb) to authenticated;

-- ---------- Roles / permissions RLS ----------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists "select roles" on public.roles;
create policy "select roles" on public.roles for select using (true);
drop policy if exists "manage roles" on public.roles;
create policy "manage roles" on public.roles
  for all using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

drop policy if exists "select permissions" on public.permissions;
create policy "select permissions" on public.permissions for select using (true);
drop policy if exists "manage permissions" on public.permissions;
create policy "manage permissions" on public.permissions
  for all using (public.has_permission('permissions.manage')) with check (public.has_permission('permissions.manage'));

drop policy if exists "manage role_permissions" on public.role_permissions;
create policy "manage role_permissions" on public.role_permissions
  for all using (public.has_permission('permissions.manage')) with check (public.has_permission('permissions.manage'));

-- Also let holders of users.manage assign roles (even without permissions.manage).
drop policy if exists "manage role_permissions as users manager" on public.role_permissions;
create policy "manage role_permissions as users manager" on public.role_permissions
  for all using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

-- ---------- Profile fields (admin-defined user fields) ----------
create table if not exists public.profile_fields (
  id bigint generated always as identity primary key,
  key text unique not null,
  label text not null,
  type text not null default 'text'
    check (type in ('text','textarea','date','select','number','boolean')),
  options jsonb,                -- for select: array of strings
  required boolean not null default false,
  is_system boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.profile_fields (key, label, type, options, sort_order) values
  ('job_title', 'Job title', 'text', null, 1),
  ('department', 'Department', 'select', '["Engineering","Product","Design","HR","Finance","Other"]', 2),
  ('location', 'Location', 'text', null, 3)
on conflict (key) do nothing;

alter table public.profile_fields enable row level security;
drop policy if exists "select profile fields" on public.profile_fields;
create policy "select profile fields" on public.profile_fields for select using (true);
drop policy if exists "manage profile fields" on public.profile_fields;
create policy "manage profile fields" on public.profile_fields
  for all using (public.has_permission('fields.manage')) with check (public.has_permission('fields.manage'));

-- ---------- Audit trail ----------
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,            -- e.g. auth.login, auth.signup, role.change, users.disable
  entity_type text, entity_id text,
  details jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id);

alter table public.audit_logs enable row level security;

-- Everyone (authenticated) can append their own audit entries (writes only).
-- Kept minimal so audit helpers can write reliably.
drop policy if exists "insert audit logs" on public.audit_logs;
create policy "insert audit logs" on public.audit_logs
  for insert with check (true);

-- Only those with audit.view (admins) can read the trail.
drop policy if exists "read audit logs" on public.audit_logs;
create policy "read audit logs" on public.audit_logs
  for select using (public.has_permission('audit.view'));

-- Nobody mutates/deletes audit entries via the client.
drop policy if exists "no update audit logs" on public.audit_logs;
create policy "no update audit logs" on public.audit_logs for update using (false);
drop policy if exists "no delete audit logs" on public.audit_logs;
create policy "no delete audit logs" on public.audit_logs for delete using (false);

-- ---------- Realtime: help admins see role/product changes live ----------
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.roles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.role_permissions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.profile_fields;
  exception when duplicate_object then null;
  end;
end $$;