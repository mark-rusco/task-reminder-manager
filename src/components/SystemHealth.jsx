import { useEffect, useMemo, useState } from 'react';
import { HeartPulse, CheckCircle2, AlertTriangle, XCircle, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CHECKS = [
  { id: 'tasks', label: 'Tasks table (tasks)', table: 'tasks', column: 'pinned', migration: '0013_task_pin.sql' },
  { id: 'dashboards', label: 'Dashboards (category/notes/workspace)', table: 'dashboards', column: 'category', migration: '0009_dashboard_type_notes.sql' },
  { id: 'workspaces', label: 'Workspaces table', table: 'workspaces', column: 'name', migration: '0012_workspaces.sql' },
  { id: 'dashboard_types', label: 'Dashboard categories (admin-managed)', table: 'dashboard_categories', column: 'value', migration: '0016_dashboard_category.sql' },
  { id: 'dashboard_notes', label: 'Dashboard change log (notes)', table: 'dashboard_notes', column: 'content', migration: '0011_dashboard_notes.sql' },
  { id: 'team_leave', label: 'Team leave tracker', table: 'team_leave', column: 'member', migration: '0014_team_leave.sql' },
  { id: 'tasks_assigned', label: 'Task team member (assigned_member)', table: 'tasks', column: 'assigned_member', migration: '0015_task_assigned_member.sql' },
];

const FIX_SQL = {
  '0013_task_pin.sql': 'alter table public.tasks add column if not exists pinned boolean not null default false;',
  '0009_dashboard_type_notes.sql': "alter table public.dashboards add column if not exists category text;\nalter table public.dashboards add column if not exists notes text;",
  '0016_dashboard_category.sql': "-- Merge type into category. Run supabase/migrations/0016_dashboard_category.sql\ncreate table if not exists public.dashboard_categories (\n  id uuid primary key default gen_random_uuid(),\n  value text not null unique,\n  label text not null,\n  color text not null default '#6366f1',\n  icon text not null default 'bar-chart',\n  sort_order integer not null default 0,\n  is_system boolean not null default false,\n  active boolean not null default true,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);",
  '0012_workspaces.sql': '-- Create the workspaces table, RLS & realtime. See supabase/migrations/0012_workspaces.sql',
  '0011_dashboard_notes.sql': '-- Create the dashboard_notes table, RLS & realtime. See supabase/migrations/0011_dashboard_notes.sql',
  '0014_team_leave.sql': '-- Create the team_leave table, RLS & realtime. See supabase/migrations/0014_team_leave.sql',
  '0015_task_assigned_member.sql': 'alter table public.tasks add column if not exists assigned_member text;',
};

async function runCheck(c) {
  try {
    const { error } = await supabase.from(c.table).select(c.column).limit(1);
    if (!error) return 'ok';
    const m = error.message || '';
    if (/does not exist/i.test(m)) return 'fail';
    return 'warn';
  } catch {
    return 'fail';
  }
}

export default function SystemHealth({ onToast }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out = {};
    for (const c of CHECKS) out[c.id] = await runCheck(c);
    setResults(out);
    setRunning(false);
  };

  useEffect(() => {
    if (!supabase) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const okCount = results ? Object.values(results).filter((r) => r === 'ok').length : 0;
  const statusMap = useMemo(() => ({ ok: CheckCircle2, warn: AlertTriangle, fail: XCircle }), []);

  const copy = (sql) => {
    navigator.clipboard?.writeText(sql);
    onToast?.('SQL copied — paste it in the Supabase SQL editor.', 'success');
  };

  if (!results) {
    return <p className="report-empty">Checking database schema…</p>;
  }

  const allOk = okCount === CHECKS.length;

  return (
    <div className="health-page">
      <section className="panel health-summary">
        <div className="panel-title">
          <HeartPulse size={16} /> System health
          <button type="button" className="icon-btn sm" onClick={run} disabled={running} title="Re-check" aria-label="Re-check">
            <RefreshCw size={15} className={running ? 'spin' : ''} />
          </button>
        </div>
        <p className={`report-status ${allOk ? 'ok' : 'warn'}`}>
          {allOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {allOk ? ' All expected tables & columns are present.' : ' Some schema is missing — run the SQL below.'} ({okCount}/{CHECKS.length} checks passed)
        </p>
      </section>

      <ul className="health-list">
        {CHECKS.map((c) => {
          const r = results[c.id];
          const Icon = statusMap[r] || XCircle;
          return (
            <li key={c.id} className={`health-row ${r}`}>
              <Icon size={18} />
              <span className="health-label">{c.label}</span>
              {r === 'ok' ? (
                <span className="health-state ok">OK</span>
              ) : (
                <>
                  <span className="health-state fail">Missing</span>
                  <div className="health-fix">
                    <code>{FIX_SQL[c.migration]}</code>
                    <button type="button" className="btn sm" onClick={() => copy(FIX_SQL[c.migration])}>
                      <Copy size={13} /> Copy SQL
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}