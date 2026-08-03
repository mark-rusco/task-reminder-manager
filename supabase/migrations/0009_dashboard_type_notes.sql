-- ============================================================
-- Focusly — dashboard type (Power BI / Excel / SharePoint) + notes
-- Run AFTER 0002_dashboards_meetings.sql in the Supabase SQL editor.
-- ============================================================

alter table public.dashboards add column if not exists type text not null default 'powerbi';
alter table public.dashboards add column if not exists notes text;
