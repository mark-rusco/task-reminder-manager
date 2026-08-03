import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, LayoutDashboard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../lib/audit';
import { TYPE_ICON_OPTIONS } from './DashboardTypeIcon.jsx';

const DRAFT = { key: '', label: '', color: '#6366f1', icon: 'bar-chart', sort_order: 0, active: true };

export default function DashboardTypesAdmin({ onToast }) {
  const { user } = useAuth();
  const [types, setTypes] = useState(null);
  const [draft, setDraft] = useState(DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [editIcon, setEditIcon] = useState('bar-chart');
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('dashboard_types').select('*').order('sort_order', { ascending: true });
    if (Array.isArray(data)) setTypes(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveNew = async (e) => {
    e.preventDefault();
    const key = draft.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || !draft.label.trim()) return onToast?.('Key and label are required', 'warning');
    const payload = {
      key,
      label: draft.label.trim(),
      color: draft.color || '#6366f1',
      icon: draft.icon,
      sort_order: Number(draft.sort_order) || 0,
      active: draft.active,
    };
    const { data, error } = await supabase.from('dashboard_types').insert(payload).select().single();
    if (error) return onToast?.('Could not add dashboard type: ' + error.message, 'warning');
    await logAudit(user, 'dash_type.create', 'dashboard_type', data.id, { key, label: payload.label });
    setDraft(DRAFT);
    load();
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditColor(t.color || '#6366f1');
    setEditIcon(t.icon || 'layout');
    setEditActive(t.active !== false);
  };

  const saveEdit = async (t) => {
    const { error } = await supabase.from('dashboard_types').update({
      label: editLabel.trim() || t.label,
      color: editColor || t.color,
      icon: editIcon,
      active: editActive,
    }).eq('id', t.id);
    if (error) return onToast?.('Could not update dashboard type: ' + error.message, 'warning');
    await logAudit(user, 'dash_type.update', 'dashboard_type', t.id, { label: editLabel });
    setEditingId(null);
    load();
  };

  const toggleActive = async (t) => {
    const { error } = await supabase.from('dashboard_types').update({ active: !t.active }).eq('id', t.id);
    if (error) return onToast?.('Could not toggle dashboard type: ' + error.message, 'warning');
    load();
  };

  const remove = async (t) => {
    if (t.is_system) return onToast?.('System types cannot be deleted', 'warning');
    if (!window.confirm(`Delete type "${t.label}"? Dashboards using it will fall back to the default.`)) return;
    const { error } = await supabase.from('dashboard_types').delete().eq('id', t.id);
    if (error) return onToast?.('Could not delete dashboard type: ' + error.message, 'warning');
    await logAudit(user, 'dash_type.delete', 'dashboard_type', t.id, { key: t.key });
    load();
  };

  const IconPicker = ({ value, onChange }) => (
    <div className="type-row" role="radiogroup" aria-label="Icon">
      {TYPE_ICON_OPTIONS.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          className={`chip chip-btn ${value === key ? 'on' : ''}`}
          title={key}
          onClick={() => onChange(key)}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-icon"><LayoutDashboard size={18} /></span>
        <div>
          <h3>Dashboard types</h3>
          <p>Categories with icons shown on dashboard cards and in the dashboard editor.</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        {!types ? (
          <p className="admin-loading"><Loader2 size={15} className="spin" /> Loading…</p>
        ) : types.length === 0 ? (
          <p className="admin-empty">No dashboard types configured.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Key</th><th>Label</th><th>Icon</th><th>Color</th><th>Enabled</th><th></th></tr>
            </thead>
            <tbody>
              {types.map((t) => (
                editingId === t.id ? (
                  <tr key={t.id}>
                    <td><strong>{t.key}</strong>{t.is_system && <span className="admin-badge">sys</span>}</td>
                    <td><input className="input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} /></td>
                    <td><IconPicker value={editIcon} onChange={setEditIcon} /></td>
                    <td>
                      <input type="color" className="color-picker" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                    </td>
                    <td><input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} /></td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => saveEdit(t)}>Save</button>
                        <button type="button" className="btn btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className={t.active ? '' : 'disabled-row'}>
                    <td><strong>{t.key}</strong>{t.is_system && <span className="admin-badge">sys</span>}</td>
                    <td>{t.label}</td>
                    <td className="muted">{t.icon}</td>
                    <td><span className="color-swatch" style={{ background: t.color || '#6366f1' }} />{t.color || ''}</td>
                    <td>{t.active ? <span className="admin-pill ok">On</span> : <span className="admin-pill warn">Off</span>}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => startEdit(t)}>Edit</button>
                        <button type="button" className="btn btn-xs" onClick={() => toggleActive(t)}>{t.active ? 'Disable' : 'Enable'}</button>
                        {!t.is_system && <button type="button" className="btn btn-xs danger" onClick={() => remove(t)}><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form className="admin-add-row" onSubmit={saveNew}>
        <input className="input" placeholder="key (e.g. tableau)" value={draft.key} onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))} />
        <input className="input" placeholder="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
        <IconPicker value={draft.icon} onChange={(icon) => setDraft((d) => ({ ...d, icon }))} />
        <label className="admin-color-field">
          <span className="form-label">Color</span>
          <input type="color" className="color-picker" value={draft.color} onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))} />
        </label>
        <label className="admin-toggle small"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} /><span>Enabled</span></label>
        <button type="submit" className="btn btn-primary"><Plus size={15} /> Add type</button>
      </form>
    </section>
  );
}