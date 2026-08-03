-- ============================================================
-- Focusly — admin-managed dashboard types (Power BI / Excel / SharePoint + more)
-- Run AFTER 0009_dashboard_type_notes.sql in the Supabase SQL editor.
-- ============================================================

create table if not exists public.dashboard_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  color text not null default '#6366f1',
  icon text not null default 'bar-chart',
  sort_order integer not null default 0,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_types enable row level security;

-- Everyone can read the type list (used to render dashboard cards and the editor).
drop policy if exists "read dashboard types" on public.dashboard_types;
create policy "read dashboard types" on public.dashboard_types
  for select using (true);

drop policy if exists "admins insert dashboard types" on public.dashboard_types;
create policy "admins insert dashboard types" on public.dashboard_types
  for insert with check (is_admin());

drop policy if exists "admins update dashboard types" on public.dashboard_types;
create policy "admins update dashboard types" on public.dashboard_types
  for update using (is_admin()) with check (is_admin());

drop policy if exists "admins delete dashboard types" on public.dashboard_types;
create policy "admins delete dashboard types" on public.dashboard_types
  for delete using (is_admin());

insert into public.dashboard_types (key, label, color, icon, sort_order, is_system, active) values
  ('powerbi', 'Power BI Dashboard', '#f2c811', 'bar-chart', 10, true, true),
  ('excel', 'Excel', '#217346', 'file-spreadsheet', 20, true, true),
  ('sharepoint', 'SharePoint Folder', '#0078d4', 'folder', 30, true, true)
on conflict (key) do nothing;

-- Realtime so type changes propagate instantly.
alter table public.dashboard_types replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.dashboard_types;
  exception when duplicate_object then null;
  end;
end $$;
