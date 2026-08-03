-- ============================================================
-- Focusly — per-user workspaces used for dashboard suggestions
-- Run AFTER 0011_dashboard_notes.sql in the Supabase SQL editor.
-- ============================================================

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create unique index if not exists workspaces_user_lower_name_idx on public.workspaces (user_id, lower(name));
create index if not exists workspaces_user_id_idx on public.workspaces (user_id);

drop policy if exists "users select own workspaces" on public.workspaces;
create policy "users select own workspaces" on public.workspaces
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own workspaces" on public.workspaces;
create policy "users insert own workspaces" on public.workspaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own workspaces" on public.workspaces;
create policy "users update own workspaces" on public.workspaces
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own workspaces" on public.workspaces;
create policy "users delete own workspaces" on public.workspaces
  for delete using (auth.uid() = user_id);

-- Realtime so the workspace list stays in sync.
alter table public.workspaces replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.workspaces;
  exception when duplicate_object then null;
  end;
end $$;