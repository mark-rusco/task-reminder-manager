-- ============================================================
-- Focusly — Team Leave Tracker (per-user)
-- Log team members' leave and the tasks that need covering.
-- Every record is scoped to the user who created it (owner),
-- so one user's team data is never visible to another user.
-- Run AFTER 0013_task_pin.sql in the Supabase SQL editor.
-- ============================================================

create table if not exists public.team_leave (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  member text not null,
  start_date date,
  end_date date,
  reason text,
  note text,
  -- Array of { id, title, done } — things to cover while this member is off.
  cover_tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.team_leave enable row level security;

create index if not exists team_leave_user_id_idx on public.team_leave (user_id);
create index if not exists team_leave_start_idx on public.team_leave (user_id, start_date desc);

drop policy if exists "team leave select own" on public.team_leave;
create policy "team leave select own" on public.team_leave
  for select using (auth.uid() = user_id);

drop policy if exists "team leave insert own" on public.team_leave;
create policy "team leave insert own" on public.team_leave
  for insert with check (auth.uid() = user_id);

drop policy if exists "team leave update own" on public.team_leave;
create policy "team leave update own" on public.team_leave
  for update using (auth.uid() = user_id);

drop policy if exists "team leave delete own" on public.team_leave;
create policy "team leave delete own" on public.team_leave
  for delete using (auth.uid() = user_id);

-- Timestamp updates on edit.
create or replace function public.touch_team_leave()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_touch_team_leave on public.team_leave;
create trigger trg_touch_team_leave
  before update on public.team_leave
  for each row execute function public.touch_team_leave();

-- Realtime so the list stays in sync across the owner's devices.
alter table public.team_leave replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.team_leave;
  exception when duplicate_object then null;
  end;
end $$;