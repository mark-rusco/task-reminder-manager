-- ============================================================
-- Focusly — pin tasks so they rise to the top when the next
-- shift starts. Run AFTER 0012_workspaces.sql.
-- ============================================================

alter table public.tasks
  add column if not exists pinned boolean not null default false;
