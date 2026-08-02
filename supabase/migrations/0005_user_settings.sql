-- ============================================================
-- Focusly — 0005: syncable user settings
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- Stores app preferences (theme, notifications, tracker config, …)
-- in a single JSONB row per user, so they sync across devices
-- while still being cached in localStorage for offline use.
-- ============================================================

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------

alter table public.user_settings enable row level security;

drop policy if exists "users select own settings" on public.user_settings;
create policy "users select own settings" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own settings" on public.user_settings;
create policy "users insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "users update own settings" on public.user_settings;
create policy "users update own settings" on public.user_settings
  for update using (auth.uid() = user_id);

drop policy if exists "users delete own settings" on public.user_settings;
create policy "users delete own settings" on public.user_settings
  for delete using (auth.uid() = user_id);

-- ---------- Auto-updated_at ----------

drop trigger if exists user_settings_updated_at on public.user_settings;
create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------- Realtime sync ----------

alter table public.user_settings replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.user_settings;
  exception when duplicate_object then null;
  end;
end $$;