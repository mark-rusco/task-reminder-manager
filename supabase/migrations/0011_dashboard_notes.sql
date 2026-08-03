-- ============================================================
-- Focusly — historical notes / change log per dashboard
-- Run AFTER 0010_dashboard_types.sql in the Supabase SQL editor.
-- ============================================================

create table if not exists public.dashboard_notes (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  note_date text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_notes enable row level security;

create index if not exists dashboard_notes_dashboard_id_idx on public.dashboard_notes (dashboard_id);
create index if not exists dashboard_notes_user_id_idx on public.dashboard_notes (user_id);

drop policy if exists "users select own dashboard notes" on public.dashboard_notes;
create policy "users select own dashboard notes" on public.dashboard_notes
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own dashboard notes" on public.dashboard_notes;
create policy "users insert own dashboard notes" on public.dashboard_notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own dashboard notes" on public.dashboard_notes;
create policy "users update own dashboard notes" on public.dashboard_notes
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own dashboard notes" on public.dashboard_notes;
create policy "users delete own dashboard notes" on public.dashboard_notes
  for delete using (auth.uid() = user_id);

-- Realtime so notes sync across devices/tabs.
alter table public.dashboard_notes replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.dashboard_notes;
  exception when duplicate_object then null;
  end;
end $$;
