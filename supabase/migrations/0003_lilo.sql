-- ============================================================
-- Focusly — LILO Tracker (leave-in / leave-out monthly sheet)
-- Run AFTER 0002_dashboards_meetings.sql in the Supabase SQL editor.
-- ============================================================

-- ---------- LILO entries (one row per user per date) ----------

create table if not exists public.lilo_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  date date not null,
  brg_type text not null default 'Non-BAU BRG',
  sched_type text not null default '5 X 9',
  eid text not null default 'mark.rusco',
  status text not null default 'Scheduled',
  start_time text not null default '04:00 PM',
  end_time text not null default '01:00 AM',
  location text not null default 'WFH',
  remarks text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.lilo_entries enable row level security;

drop policy if exists "users select own lilo entries" on public.lilo_entries;
create policy "users select own lilo entries" on public.lilo_entries
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own lilo entries" on public.lilo_entries;
create policy "users insert own lilo entries" on public.lilo_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own lilo entries" on public.lilo_entries;
create policy "users update own lilo entries" on public.lilo_entries
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own lilo entries" on public.lilo_entries;
create policy "users delete own lilo entries" on public.lilo_entries
  for delete using (auth.uid() = user_id);

create index if not exists lilo_entries_user_month_idx on public.lilo_entries (user_id, month);

drop trigger if exists lilo_entries_updated_at on public.lilo_entries;
create trigger lilo_entries_updated_at
  before update on public.lilo_entries
  for each row execute function public.set_updated_at();

-- ---------- Monthly submission flag ----------

create table if not exists public.lilo_submissions (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  submitted_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.lilo_submissions enable row level security;

drop policy if exists "users select own lilo submissions" on public.lilo_submissions;
create policy "users select own lilo submissions" on public.lilo_submissions
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own lilo submissions" on public.lilo_submissions;
create policy "users insert own lilo submissions" on public.lilo_submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "users delete own lilo submissions" on public.lilo_submissions;
create policy "users delete own lilo submissions" on public.lilo_submissions
  for delete using (auth.uid() = user_id);

-- ---------- Realtime ----------

alter table public.lilo_entries replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.lilo_entries;
  exception when duplicate_object then null;
  end;
end $$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.lilo_submissions;
  exception when duplicate_object then null;
  end;
end $$;
