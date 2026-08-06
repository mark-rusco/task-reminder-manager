import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, LayoutDashboard, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../lib/audit';
import { CATEGORY_ICON_OPTIONS } from './DashboardCategoryIcon.jsx';

const DRAFT = { value: '', label: '', color: '#6366f1', icon: 'bar-chart', sort_order: 0, active: true };

export default function DashboardCategoriesAdmin({ onToast }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState(null);
  const [draft, setDraft] = useState(DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('#6366f1');
  const [editIcon, setEditIcon] = useState('bar-chart');
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('dashboard_categories').select('*').order('sort_order', { ascending: true });
    if (Array.isArray(data)) setCategories(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveNew = async (e) => {
    e.preventDefault();
    const value = draft.value.trim().toLowerCase().replace(/\s+/g, '_');
    if (!value || !draft.label.trim()) return onToast?.('Key and label are required', 'warning');
    const payload = {
      value,
      label: draft.label.trim(),
      color: draft.color || '#6366f1',
      icon: draft.icon,
      sort_order: Number(draft.sort_order) || 0,
      active: draft.active,
    };
    const { data, error } = await supabase.from('dashboard_categories').insert(payload).select().single();
    if (error) return onToast?.('Could not add category: ' + error.message, 'warning');
    await logAudit(user, 'dash_category.create', 'dashboard_category', data.id, { value, label: payload.label });
    setDraft(DRAFT);
    load();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditLabel(c.label);
    setEditColor(c.color || '#6366f1');
    setEditIcon(c.icon || 'layout');
    setEditActive(c.active !== false);
  };

  const saveEdit = async (c) => {
    const { error } = await supabase.from('dashboard_categories').update({
      label: editLabel.trim() || c.label,
      color: editColor || c.color,
      icon: editIcon,
      active: editActive,
    }).eq('id', c.id);
    if (error) return onToast?.('Could not update category: ' + error.message, 'warning');
    await logAudit(user, 'dash_category.update', 'dashboard_category', c.id, { label: editLabel });
    setEditingId(null);
    load();
  };

  const toggleActive = async (c) => {
    const { error } = await supabase.from('dashboard_categories').update({ active: !c.active }).eq('id', c.id);
    if (error) return onToast?.('Could not toggle category: ' + error.message, 'warning');
    load();
  };

  const remove = async (c) => {
    if (c.is_system) return onToast?.('System categories cannot be deleted', 'warning');
    if (!window.confirm(`Delete category "${c.label}"? Dashboards using it will fall back to the default.`)) return;
    const { error } = await supabase.from('dashboard_categories').delete().eq('id', c.id);
    if (error) return onToast?.('Could not delete category: ' + error.message, 'warning');
    await logAudit(user, 'dash_category.delete', 'dashboard_category', c.id, { value: c.value });
    load();
  };

  const IconPicker = ({ value, onChange }) => (
    <div className="type-row" role="radiogroup" aria-label="Icon">
      {CATEGORY_ICON_OPTIONS.map(({ key, Icon }) => (
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
          <h3>Dashboard categories</h3>
          <p>Categories with icons shown on dashboard cards and in the dashboard editor.</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        {!categories ? (
          <p className="admin-loading"><Loader2 size={15} className="spin" /> Loading…</p>
        ) : categories.length === 0 ? (
          <p className="admin-empty">No categories configured.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Key</th><th>Label</th><th>Icon</th><th>Color</th><th>Enabled</th><th></th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                editingId === c.id ? (
                  <tr key={c.id}>
                    <td><strong>{c.value}</strong>{c.is_system && <span className="admin-badge">sys</span>}</td>
                    <td><input className="input" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} /></td>
                    <td><IconPicker value={editIcon} onChange={setEditIcon} /></td>
                    <td>
                      <input type="color" className="color-picker" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                    </td>
                    <td><input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} /></td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => saveEdit(c)}>Save</button>
                        <button type="button" className="btn btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className={c.active ? '' : 'disabled-row'}>
                    <td><strong>{c.value}</strong>{c.is_system && <span className="admin-badge">sys</span>}</td>
                    <td>{c.label}</td>
                    <td className="muted">{c.icon}</td>
                    <td><span className="color-swatch" style={{ background: c.color || '#6366f1' }} />{c.color || ''}</td>
                    <td>{c.active ? <span className="admin-pill ok">On</span> : <span className="admin-pill warn">Off</span>}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => startEdit(c)}>Edit</button>
                        <button type="button" className="btn btn-xs" onClick={() => toggleActive(c)}>{c.active ? 'Disable' : 'Enable'}</button>
                        {!c.is_system && <button type="button" className="btn btn-xs danger" onClick={() => remove(c)}><Trash2 size={13} /></button>}
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
        <input className="input" placeholder="key (e.g. tableau)" value={draft.value} onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))} />
        <input className="input" placeholder="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
        <IconPicker value={draft.icon} onChange={(icon) => setDraft((d) => ({ ...d, icon }))} />
        <label className="admin-color-field">
          <span className="form-label">Color</span>
          <input type="color" className="color-picker" value={draft.color} onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))} />
        </label>
        <label className="admin-toggle small"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} /><span>Enabled</span></label>
        <button type="submit" className="btn btn-primary"><Plus size={15} /> Add category</button>
      </form>
    </section>
  );
}
