-- ============================================================
-- Focusly — dashboards inventory, progress tracker & meeting tasks
-- Run AFTER 0001_init.sql in the Supabase SQL editor.
-- ============================================================

-- ---------- Dashboards ----------

create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  url text,
  workspace text,
  status text not null default 'planning',
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  due_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboards enable row level security;

drop policy if exists "users select own dashboards" on public.dashboards;
create policy "users select own dashboards" on public.dashboards
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own dashboards" on public.dashboards;
create policy "users insert own dashboards" on public.dashboards
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own dashboards" on public.dashboards;
create policy "users update own dashboards" on public.dashboards
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own dashboards" on public.dashboards;
create policy "users delete own dashboards" on public.dashboards
  for delete using (auth.uid() = user_id);

create index if not exists dashboards_user_id_idx on public.dashboards (user_id);

drop trigger if exists dashboards_updated_at on public.dashboards;
create trigger dashboards_updated_at
  before update on public.dashboards
  for each row execute function public.set_updated_at();

-- ---------- Meeting fields on tasks ----------

alter table public.tasks add column if not exists task_type text not null default 'task';
alter table public.tasks add column if not exists meeting_notes text;
alter table public.tasks add column if not exists screenshot text;
alter table public.tasks add column if not exists dashboard_id uuid;

create index if not exists tasks_dashboard_id_idx on public.tasks (dashboard_id);

-- ---------- Realtime for dashboards ----------

alter table public.dashboards replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.dashboards;
  exception when duplicate_object then null;
  end;
end $$;
