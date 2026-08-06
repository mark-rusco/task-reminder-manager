-- ============================================================
-- Focusly — Task team member assignment
-- Lets a task be assigned to a team member (free text, matching
-- the member names used in the team leave tracker). When that
-- member is on leave, the user's open tasks assigned to them are
-- auto-listed for coverage selection.
-- Run AFTER 0014_team_leave.sql in the Supabase SQL editor.
-- ============================================================

alter table public.tasks add column if not exists assigned_member text;

create index if not exists tasks_assigned_member_idx on public.tasks (user_id, assigned_member);
