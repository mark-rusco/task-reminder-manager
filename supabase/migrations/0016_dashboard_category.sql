-- 0016: merge dashboard "type" into "category" — rename the dashboards column,
-- rename dashboard_types to dashboard_categories, backfill values and expand
-- the seed set to the full category list. Safe to run if a previous v1 of this
-- migration added a `category` column already.
alter table public.dashboards drop column if exists category;
alter table public.dashboards rename column type to category;

alter table public.dashboard_types rename to dashboard_categories;
alter table public.dashboard_categories rename column key to value;

-- Migrate legacy values to the new category set.
update public.dashboards set category = case category
  when 'powerbi' then 'dashboard'
  else coalesce(category, 'dashboard')
end;

insert into public.dashboard_categories (value, label, color, icon, sort_order, is_system, active) values
  ('dashboard', 'Dashboards', '#6366f1', 'layout', 10, true, true),
  ('report', 'Reports', '#8b5cf6', 'bar-chart', 20, true, true),
  ('excel', 'Excel', '#16a34a', 'file-spreadsheet', 30, true, true),
  ('office', 'Office tools', '#0ea5e9', 'laptop', 40, true, true),
  ('github', 'GitHub', '#64748b', 'code', 50, true, true),
  ('sharepoint', 'SharePoint', '#2563eb', 'folder', 60, true, true),
  ('other', 'Other', '#94a3b8', 'box', 70, true, true)
on conflict (value) do update set
  label = excluded.label,
  color = excluded.color,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- The old powerbi key was folded into the "Dashboards" category above.
delete from public.dashboard_categories where value = 'powerbi';

create index if not exists dashboards_category_idx on public.dashboards (user_id, category);
