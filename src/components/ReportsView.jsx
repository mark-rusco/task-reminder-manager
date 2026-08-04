import { BarChart3, PieChart, TrendingUp, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { dashboardStatusMeta } from '../utils/constants';
import { downloadCSV, downloadJSON, todayStamp } from '../utils/export';

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function lastNDayBuckets(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push({ key: daysAgo(i), label: daysAgo(i).slice(5) });
  return out;
}

const LABEL_COLORS = ['#6366f1', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#94a3b8'];

/** Lightweight SVG bar chart — no external chart dependency. */
function Bars({ data, height = 120, color = 'var(--primary)' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart-bars" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="chart-bar-col" title={`${d.label}: ${d.value}`}>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ height: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="chart-bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsView({ tasks, labels, dashboards, liloEntries, trackerConfig, trackerMonth }) {
  // --- Completion trend: tasks completed per day (last 14 days)
  const trend = lastNDayBuckets(14).map((b) => ({
    ...b,
    value: tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === b.key).length,
  }));

  // --- Completion rate this week (completed vs due)
  const weekStart = daysAgo(6);
  const dueThisWeek = tasks.filter((t) => t.dueDate && t.dueDate >= weekStart).length;
  const completedThisWeek = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= weekStart).length;
  const rate = dueThisWeek ? Math.round((completedThisWeek / dueThisWeek) * 100) : 0;

  // --- Overdue backlog now
  const overdue = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < daysAgo(0)).length;

  // --- Per-category throughput (completed in last 30 days)
  const since30 = daysAgo(30);
  const labelsWithCount = labels
    .map((l, i) => ({
      label: l.name,
      value: tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) >= since30 && (t.labels || []).includes(l.id)).length,
      color: l.color || LABEL_COLORS[i % LABEL_COLORS.length],
    }))
    .filter((l) => l.value > 0);

  // --- Dashboard health (status distribution)
  const dashByStatus = (status) => dashboards.filter((d) => d.status === status).length;
  const dashTotal = dashboards.length;
  const dashPct = (n) => (dashTotal ? Math.round((n / dashTotal) * 100) : 0);
  const published = dashByStatus('published');
  const stuck = dashByStatus('in-review') + dashByStatus('in-progress');

  // --- PTO / Sick / RTO summary from tracker config (already computed figures via config)
  const ptoPct = trackerConfig?.ptoLimit ? Math.min(100, Math.round((trackerConfig.ptoUsed ?? 0) / trackerConfig.ptoLimit * 100)) : 0;

  // --- Status legend for dashboards
  const statusLegend = ['planning', 'in-progress', 'in-review', 'published', 'deprecated'].map((s) => {
    const meta = dashboardStatusMeta(s);
    return { label: meta.label, value: dashByStatus(s), color: meta.color };
  });

  const labelName = (id) => labels.find((l) => l.id === id)?.name || '';
  const dashName = (id) => dashboards.find((d) => d.id === id)?.name || '';

  const exportTasks = () =>
    downloadCSV(`focusly-tasks-${todayStamp()}.csv`, ['Title', 'Category', 'Due date', 'Due time', 'Status', 'Pinned', 'Dashboard', 'Created'],
      tasks.map((t) => [
        t.title,
        (t.labels || []).map(labelName).join('; '),
        t.dueDate || '',
        t.dueTime || '',
        t.completed ? 'Completed' : 'Pending',
        t.pinned ? 'Yes' : '',
        (t.dashboardIds || []).map(dashName).join('; '),
        t.createdAt ? t.createdAt.slice(0, 10) : '',
      ]));

  const exportDashboards = () =>
    downloadCSV(`focusly-dashboards-${todayStamp()}.csv`, ['Name', 'Type', 'Status', 'Progress %', 'Notes'],
      dashboards.map((d) => [d.name, d.type || '', dashboardStatusMeta(d.status || 'planning').label, d.progress ?? '', d.notes || '']));

  const exportLilo = () =>
    downloadCSV(`focusly-lilo-${todayStamp()}.csv`, ['Date', 'Status', 'Location', 'Start', 'End'],
      (liloEntries || []).map((e) => [e.date, e.status, e.location || '', e.startTime || '', e.endTime || '']));

  const exportBackup = () =>
    downloadJSON(`focusly-backup-${todayStamp()}.json`, {
      exportedAt: new Date().toISOString(),
      tasks: tasks.map(({ user_id, ...t }) => t),
      dashboards,
      labels,
      liloEntries,
    });

  return (
    <div className="reports-page">
      <div className="reports-toolbar">
        <span className="reports-toolbar-label">
          <Download size={14} /> Export
        </span>
        <button type="button" className="btn sm" onClick={exportTasks}>Tasks CSV</button>
        <button type="button" className="btn sm" onClick={exportDashboards}>Dashboards CSV</button>
        <button type="button" className="btn sm" onClick={exportLilo}>LILO CSV</button>
        <button type="button" className="btn sm" onClick={exportBackup}>Full backup (JSON)</button>
      </div>
      <div className="reports-grid">
        <section className="panel report-card">
          <div className="panel-title">
            <TrendingUp size={16} /> Completion trend
            <span className="report-span">last 14 days</span>
          </div>
          <Bars data={trend} color="var(--success)" />
        </section>

        <section className="panel report-card">
          <div className="panel-title">
            <CheckCircle2 size={16} /> This week
          </div>
          <div className="report-big">
            <strong>{rate}%</strong>
            <span>completion rate ({completedThisWeek}/{dueThisWeek} due)</span>
          </div>
          <p className={`report-status ${overdue ? 'warn' : 'ok'}`}>
            {overdue > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {overdue} overdue right now
          </p>
        </section>

        <section className="panel report-card">
          <div className="panel-title">
            <BarChart3 size={16} /> Completed by category
            <span className="report-span">last 30 days</span>
          </div>
          {labelsWithCount.length === 0 ? (
            <p className="report-empty">No completions yet.</p>
          ) : (
            <ul className="report-legend">
              {labelsWithCount.map((l, i) => (
                <li key={i}>
                  <span className="report-legend-dot" style={{ background: l.color }} />
                  <span className="report-legend-name">{l.label}</span>
                  <span className="report-legend-val">{l.value}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel report-card">
          <div className="panel-title">
            <PieChart size={16} /> Dashboard health
          </div>
          {dashTotal === 0 ? (
            <p className="report-empty">No dashboards yet.</p>
          ) : (
            <>
              <ul className="report-legend">
                {statusLegend.map((s, i) => (
                  <li key={i}>
                    <span className="report-legend-dot" style={{ background: s.color }} />
                    <span className="report-legend-name">{s.label}</span>
                    <span className="report-legend-val">{s.value}</span>
                  </li>
                ))}
              </ul>
              <div className="report-stack">
                {statusLegend.map((s, i) =>
                  s.value ? <div key={i} className="report-stack-seg" style={{ width: `${dashPct(s.value)}%`, background: s.color }} /> : null,
                )}
              </div>
              <p className={`report-status ${published >= (dashTotal - published) ? 'ok' : 'warn'}`}>
                {published} published · {stuck} still in progress/review
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}