-- ============================================================
-- Focusly — Supabase schema & security
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------- Tables ----------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text not null default '',
  due_date text,
  due_time text,
  priority text not null default 'none',
  labels text[] not null default '{}',
  recurrence jsonb,
  reminder jsonb,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------

alter table public.tasks enable row level security;
alter table public.labels enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "users select own tasks" on public.tasks;
create policy "users select own tasks" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own tasks" on public.tasks;
create policy "users insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own tasks" on public.tasks;
create policy "users update own tasks" on public.tasks
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own tasks" on public.tasks;
create policy "users delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

drop policy if exists "users select own labels" on public.labels;
create policy "users select own labels" on public.labels
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own labels" on public.labels;
create policy "users insert own labels" on public.labels
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own labels" on public.labels;
create policy "users update own labels" on public.labels
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own labels" on public.labels;
create policy "users delete own labels" on public.labels
  for delete using (auth.uid() = user_id);

drop policy if exists "users select own profile" on public.profiles;
create policy "users select own profile" on public.profiles
  for select using (auth.uid() = id);

-- ---------- Indexes ----------

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists labels_user_id_idx on public.labels (user_id);

-- ---------- Auto-updated_at ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists labels_updated_at on public.labels;
create trigger labels_updated_at
  before update on public.labels
  for each row execute function public.set_updated_at();

-- ---------- Profile on signup ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Realtime sync ----------

alter table public.tasks replica identity full;
alter table public.labels replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.labels;
  exception when duplicate_object then null;
  end;
end $$;
