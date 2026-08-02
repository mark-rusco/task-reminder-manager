-- ============================================================
-- Focusly — link multiple reports/dashboards to a task
-- Run AFTER 0003_lilo.sql in the Supabase SQL editor.
-- ============================================================

-- Backed up the earlier single-link/refresh_url approach (not released).
alter table public.tasks drop column if exists refresh_url;

-- Multiple dashboard/report links per task.
alter table public.tasks add column if not exists dashboard_ids text[] not null default '{}';

create index if not exists tasks_dashboard_ids_idx on public.tasks using gin (dashboard_ids);