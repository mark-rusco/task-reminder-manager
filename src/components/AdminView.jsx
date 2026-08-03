import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Users, KeyRound, ListChecks, History, Settings2, Loader2, Plus, Trash2, ToggleLeft, ToggleRight, LayoutDashboard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../lib/audit';
import { friendlyAuthError } from '../lib/authErrors';
import DashboardTypesAdmin from './DashboardTypesAdmin.jsx';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'roles', label: 'Roles & Permissions', icon: KeyRound },
  { id: 'fields', label: 'Profile Fields', icon: ListChecks },
  { id: 'types', label: 'Dashboard Types', icon: LayoutDashboard },
  { id: 'settings', label: 'Settings', icon: Settings2 },
  { id: 'audit', label: 'Audit Trail', icon: History },
];

const FIELD_TYPES = ['text', 'textarea', 'date', 'select', 'number', 'boolean', 'timerange'];

export default function AdminView({ onToast }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('users');

  if (!isAdmin) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <ShieldCheck size={30} />
        </div>
        <h3>Admin only</h3>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'users' && <UsersTab onToast={onToast} />}
      {tab === 'roles' && <RolesTab onToast={onToast} />}
      {tab === 'fields' && <FieldsTab onToast={onToast} />}
      {tab === 'types' && <DashboardTypesAdmin onToast={onToast} />}
      {tab === 'settings' && <SettingsTab onToast={onToast} />}
      {tab === 'audit' && <AuditTab onToast={onToast} />}
    </div>
  );
}

/* ---------------- Users ---------------- */
function UsersTab({ onToast }) {
  const { user, refreshProfile } = useAuth();
  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user', first_name: '', last_name: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [{ data: u }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.from('roles').select('name').order('name'),
    ]);
    if (Array.isArray(u)) setUsers(u);
    if (Array.isArray(r)) setRoles(r.map((x) => x.name));
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch).catch(() => {});
  }, [load]);

  const apply = async (u, patch, action, details) => {
    setSavingId(u.id);
    const { error } = await supabase.from('profiles').update(patch).eq('id', u.id);
    setSavingId(null);
    if (error) return onToast?.('Update failed: ' + error.message, 'warning');
    await logAudit(user, action, 'profile', u.id, { email: u.email, ...details });
    onToast?.(`${u.email || 'User'} updated`, 'success');
    await load();
    if (u.id === user?.id) refreshProfile?.();
  };

  const changeRole = (u, role) => apply(u, { role }, 'users.role_change', { from: u.role, to: role, role });
  const toggleDisabled = (u) => apply(u, { disabled: !u.disabled }, u.disabled ? 'users.enable' : 'users.disable', { disabled: !u.disabled });

  const sendReset = async (u) => {
    setResetId(u.id);
    const { error } = await supabase.auth.resetPasswordForEmail(u.email, { redirectTo: window.location.origin });
    setResetId(null);
    if (error) {
      console.error('password reset failed', error);
      return onToast?.('Could not send reset: ' + friendlyAuthError(error), 'warning');
    }
    await logAudit(user, 'users.password_reset', 'profile', u.id, { email: u.email });
    onToast?.(`Reset link sent to ${u.email}`, 'success');
  };

  const addUser = async (e) => {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(newUser.email)) return onToast?.('Enter a valid email address', 'warning');
    if (newUser.password.length < 6) return onToast?.('Password must be at least 6 characters', 'warning');
    setAdding(true);
    const custom = {};
    if (newUser.first_name.trim()) custom.first_name = newUser.first_name.trim();
    if (newUser.last_name.trim()) custom.last_name = newUser.last_name.trim();
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: newUser.email.trim(),
      p_password: newUser.password,
      p_role: newUser.role,
      p_custom_fields: custom,
    });
    setAdding(false);
    if (error) return onToast?.('Could not create user: ' + error.message, 'warning');
    await logAudit(user, 'users.create', 'profile', data, { email: newUser.email.trim(), role: newUser.role });
    onToast?.(`Account created for ${newUser.email.trim()}`, 'success');
    setNewUser({ email: '', password: '', role: 'user', first_name: '', last_name: '' });
    setShowAdd(false);
    load();
  };

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-icon"><Users size={18} /></span>
        <div>
          <h3>Users &amp; accounts</h3>
          <p>{users ? `${users.length} account${users.length !== 1 ? 's' : ''}` : 'Loading…'}</p>
        </div>
        <button type="button" className="btn btn-primary admin-head-btn" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={15} /> {showAdd ? 'Cancel' : 'Add user'}
        </button>
      </div>

      {showAdd && (
        <form className="admin-add-user" onSubmit={addUser}>
          <div className="admin-field">
            <label className="form-label" htmlFor="nu-email">Email</label>
            <input id="nu-email" className="input" type="email" placeholder="new@example.com" value={newUser.email} onChange={(e) => setNewUser((n) => ({ ...n, email: e.target.value }))} required />
          </div>
          <div className="admin-field">
            <label className="form-label" htmlFor="nu-pw">Temporary password</label>
            <input id="nu-pw" className="input" type="text" placeholder="Min. 6 characters" value={newUser.password} onChange={(e) => setNewUser((n) => ({ ...n, password: e.target.value }))} required />
          </div>
          <div className="admin-field">
            <label className="form-label" htmlFor="nu-role">Role</label>
            <select id="nu-role" className="input" value={newUser.role} onChange={(e) => setNewUser((n) => ({ ...n, role: e.target.value }))}>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="form-label" htmlFor="nu-first">First name</label>
            <input id="nu-first" className="input" type="text" placeholder="Optional" value={newUser.first_name} onChange={(e) => setNewUser((n) => ({ ...n, first_name: e.target.value }))} />
          </div>
          <div className="admin-field">
            <label className="form-label" htmlFor="nu-last">Last name</label>
            <input id="nu-last" className="input" type="text" placeholder="Optional" value={newUser.last_name} onChange={(e) => setNewUser((n) => ({ ...n, last_name: e.target.value }))} />
          </div>
          <div className="admin-add-user-actions">
            <button type="submit" className="btn btn-primary" disabled={adding}>
              {adding && <Loader2 size={15} className="spin" />}
              Create account
            </button>
          </div>
          <p className="admin-hint">The user is created and can sign in immediately — no confirmation email is required.</p>
        </form>
      )}

      <div className="admin-table-wrap">
        {!users ? (
          <p className="admin-loading"><Loader2 size={15} className="spin" /> Loading…</p>
        ) : users.length === 0 ? (
          <p className="admin-empty">No users found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th className="admin-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const selfRow = u.id === user?.id;
                const busy = savingId === u.id;
                return (
                  <tr key={u.id} className={u.disabled ? 'disabled-row' : ''}>
                    <td>
                      <strong>{u.email || 'No email'}</strong>
                      {selfRow && <span className="admin-badge">you</span>}
                    </td>
                    <td>
                      <select
                        className="input"
                        value={u.role}
                        disabled={busy || selfRow}
                        title={selfRow ? 'You cannot change your own role' : 'Assign role'}
                        onChange={(e) => changeRole(u, e.target.value)}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{u.disabled ? <span className="admin-pill warn">Disabled</span> : <span className="admin-pill ok">Active</span>}</td>
                    <td className="admin-nowrap muted">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => toggleDisabled(u)} title={u.disabled ? 'Enable account' : 'Disable account'}>
                          {u.disabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {u.disabled ? 'Enable' : 'Disable'}
                        </button>
                        <button type="button" className="btn btn-xs" disabled={resetId === u.id} onClick={() => sendReset(u)}>
                          Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="admin-hint">
        <ShieldCheck size={13} /> Role changes and account toggles are recorded in the audit trail.
      </p>
    </section>
  );
}

/* ---------------- Roles & Permissions ---------------- */
function RolesTab({ onToast }) {
  const { user } = useAuth();
  const [roles, setRoles] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [mapping, setMapping] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = useCallback(async () => {
    const [{ data: r }, { data: p }, { data: m }] = await Promise.all([
      supabase.from('roles').select('*').order('name'),
      supabase.from('permissions').select('*').order('category'),
      supabase.from('role_permissions').select('*'),
    ]);
    if (Array.isArray(r)) setRoles(r);
    if (Array.isArray(p)) setPermissions(p);
    if (Array.isArray(m)) setMapping(m);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRole = roles?.find((x) => x.id === selectedRoleId) || roles?.[0] || null;

  const byCategory = useMemo(() => {
    const g = {};
    for (const p of permissions || []) (g[p.category || 'Other'] = g[p.category || 'Other'] || []).push(p);
    return g;
  }, [permissions]);

  const effectiveRoleId = selectedRoleId || selectedRole?.id;

  const addRole = async (e) => {
    e.preventDefault();
    const name = newRole.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return;
    const { data, error } = await supabase.from('roles').insert({ name, label: newRole.name.trim(), description: newRole.description.trim() || null }).select().single();
    if (error) return onToast?.('Could not create role: ' + error.message, 'warning');
    await logAudit(user, 'roles.create', 'role', data.id, { name });
    setNewRole({ name: '', description: '' });
    setSelectedRoleId(data.id);
    load();
  };

  const beginEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.label);
    setEditDesc(r.description || '');
  };

  const saveEdit = async (r) => {
    const { error } = await supabase.from('roles').update({ label: editName.trim() || r.label, description: editDesc.trim() || null }).eq('id', r.id);
    if (error) return onToast?.('Could not update role: ' + error.message, 'warning');
    await logAudit(user, 'roles.update', 'role', r.id, { label: editName });
    setEditingId(null);
    load();
  };

  const deleteRole = async (r) => {
    if (r.is_system) return;
    if (!window.confirm(`Delete role "${r.label}"? Its permission assignments will be removed too.`)) return;
    const { error } = await supabase.from('roles').delete().eq('id', r.id);
    if (error) return onToast?.('Could not delete role: ' + error.message, 'warning');
    await logAudit(user, 'roles.delete', 'role', r.id, { name: r.label });
    setSelectedRoleId((id) => (id === r.id ? null : id));
    load();
  };

  const togglePermission = async (perm, roleId) => {
    const has = mapping.some((m) => m.role_id === roleId && m.permission_id === perm.id);
    let error;
    if (has) {
      ({ error } = await supabase.from('role_permissions').delete().eq('role_id', roleId).eq('permission_id', perm.id));
    } else {
      ({ error } = await supabase.from('role_permissions').insert({ role_id: roleId, permission_id: perm.id }));
    }
    if (error) return onToast?.('Could not update permission: ' + error.message, 'warning');
    await logAudit(user, has ? 'roles.permission_revoke' : 'roles.permission_grant', 'role_permission', roleId, { permission: perm.key, role_id: roleId });
    load();
  };

  return (
    <>
      <section className="admin-card">
        <div className="admin-card-head">
          <span className="admin-card-icon"><KeyRound size={18} /></span>
          <div>
            <h3>Roles</h3>
            <p>{roles ? `${roles.length} role${roles.length !== 1 ? 's' : ''}` : 'Loading…'}</p>
          </div>
        </div>

        <div className="roles-grid">
          {!roles ? (
            <p className="admin-loading"><Loader2 size={15} className="spin" /> Loading…</p>
          ) : (
            roles.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`role-card ${r.id === effectiveRoleId ? 'active' : ''} ${r.is_system ? 'system' : ''}`}
                onClick={() => setSelectedRoleId(r.id)}
              >
                <div className="role-card-title">
                  <strong>{r.label}</strong>
                  {r.is_system && <span className="admin-badge">system</span>}
                </div>
                <code className="role-card-key">{r.name}</code>
                <p className="role-card-desc">{r.description || 'No description'}</p>
              </button>
            ))
          )}
          <form className="admin-card admin-add-role" onSubmit={addRole}>
            <h4>Add role</h4>
            <input className="input" placeholder="Name (e.g. Manager)" value={newRole.name} onChange={(e) => setNewRole((n) => ({ ...n, name: e.target.value }))} />
            <input className="input" placeholder="Description (optional)" value={newRole.description} onChange={(e) => setNewRole((n) => ({ ...n, description: e.target.value }))} />
            <button type="submit" className="btn btn-primary"><Plus size={15} /> Add role</button>
          </form>
        </div>

        {editingId && (
          <div className="admin-inline-edit">
            <h5>Edit role</h5>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <input className="input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            <div>
              <button type="button" className="btn btn-xs" onClick={() => saveEdit(roles.find((r) => r.id === editingId))}>Save</button>
              <button type="button" className="btn btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
              <button type="button" className="btn btn-xs danger" onClick={() => deleteRole(roles.find((r) => r.id === editingId))}>Delete</button>
            </div>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <span className="admin-card-icon"><KeyRound size={18} /></span>
          <div>
            <h3>Permissions</h3>
            <p>{selectedRole ? `Assigning for "${selectedRole.label}"` : 'Add at least one role to start'}</p>
          </div>
        </div>

        {!selectedRole ? (
          <p className="admin-empty">No roles yet.</p>
        ) : (
          <div className="perm-matrix">
            {Object.keys(byCategory).map((cat) => (
              <div className="perm-category" key={cat}>
                <div className="perm-cat-label">{cat}</div>
                <div className="perm-list">
                  {(byCategory[cat] || []).map((p) => {
                    const isAdminRole = selectedRole.name === 'admin';
                    const on = mapping.some((m) => m.role_id === selectedRole.id && m.permission_id === p.id) || isAdminRole;
                    return (
                      <label key={p.id} className={`perm-row ${on ? 'on' : ''} ${isAdminRole ? 'locked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={isAdminRole}
                          onChange={() => togglePermission(p, selectedRole.id)}
                        />
                        <span className="perm-key">{p.key}</span>
                        <span className="perm-label">{p.label}</span>
                        {isAdminRole && <span className="admin-badge">implicit</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="admin-hint">
          <ShieldCheck size={13} /> Administrators implicitly hold every permission — their matrix is shown but fixed.
        </p>
      </section>
    </>
  );
}

/* ---------------- Profile Fields ---------------- */
function FieldsTab({ onToast }) {
  const { user } = useAuth();
  const [fields, setFields] = useState(null);
  const [draft, setDraft] = useState(defaultFieldDraft());
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profile_fields').select('*').order('sort_order', { ascending: true });
    if (Array.isArray(data)) setFields(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveNew = async (e) => {
    e.preventDefault();
    const key = draft.key.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || !draft.label.trim()) return onToast?.('Key and label are required', 'warning');
    const payload = {
      key,
      label: draft.label.trim(),
      type: draft.type,
      required: draft.required,
      sort_order: Number(draft.sort_order) || 0,
      active: draft.active,
      options: draft.type === 'select' ? (draft.options.split(',').map((s) => s.trim()).filter(Boolean) || null) : null,
    };
    const { data, error } = await supabase.from('profile_fields').insert(payload).select().single();
    if (error) return onToast?.('Could not add field: ' + error.message, 'warning');
    await logAudit(user, 'field.create', 'profile_field', data.id, payload);
    setDraft(defaultFieldDraft());
    load();
  };

  const saveEdit = async (f) => {
    const { error } = await supabase.from('profile_fields').update({
      label: draft.label.trim() || f.label,
      type: draft.type,
      required: draft.required,
      sort_order: Number(draft.sort_order) || f.sort_order,
      active: draft.active,
      options: draft.type === 'select' ? (draft.options.split(',').map((s) => s.trim()).filter(Boolean) || null) : null,
    }).eq('id', f.id);
    if (error) return onToast?.('Could not update field: ' + error.message, 'warning');
    await logAudit(user, 'field.update', 'profile_field', f.id, { label: draft.label });
    setEditingId(null);
    load();
  };

  const toggleActive = async (f) => {
    const { error } = await supabase.from('profile_fields').update({ active: !f.active }).eq('id', f.id);
    if (error) return onToast?.('Could not toggle field: ' + error.message, 'warning');
    load();
  };

  const remove = async (f) => {
    if (f.is_system) return;
    if (!window.confirm(`Delete field "${f.label}"?`)) return;
    const { error } = await supabase.from('profile_fields').delete().eq('id', f.id);
    if (error) return onToast?.('Could not delete field: ' + error.message, 'warning');
    await logAudit(user, 'field.delete', 'profile_field', f.id, { key: f.key });
    load();
  };

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-icon"><ListChecks size={18} /></span>
        <div>
          <h3>User profile fields</h3>
          <p>Fields shown in the "My profile" editor — stored per user in custom_fields.</p>
        </div>
      </div>

      <div className="admin-table-wrap">
        {!fields ? (
          <p className="admin-loading"><Loader2 size={15} className="spin" /> Loading…</p>
        ) : fields.length === 0 ? (
          <p className="admin-empty">No fields configured.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>Key</th><th>Label</th><th>Type</th><th>Required</th><th>Enabled</th><th></th></tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                editingId === f.id ? (
                  <tr key={f.id}>
                    <td><strong>{f.key}</strong>{f.is_system && <span className="admin-badge">sys</span>}</td>
                    <td><input className="input" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} /></td>
                    <td>
                      <select className="input" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                        {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td><input type="checkbox" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} /></td>
                    <td><input type="checkbox" checked={draft.active} onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))} /></td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => saveEdit(f)}>Save</button>
                        <button type="button" className="btn btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id} className={f.active ? '' : 'disabled-row'}>
                    <td><strong>{f.key}</strong>{f.is_system && <span className="admin-badge">sys</span>}</td>
                    <td>{f.label}</td>
                    <td className="muted">{f.type}</td>
                    <td>{f.required ? 'Yes' : '—'}</td>
                    <td>{f.active ? <span className="admin-pill ok">On</span> : <span className="admin-pill warn">Off</span>}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-xs" onClick={() => { setEditingId(f.id); setDraft({ label: f.label, type: f.type, options: (f.options || []).join(', '), required: f.required, sort_order: f.sort_order, active: f.active }); }}>Edit</button>
                        <button type="button" className="btn btn-xs" onClick={() => toggleActive(f)}>{f.active ? 'Disable' : 'Enable'}</button>
                        {!f.is_system && <button type="button" className="btn btn-xs danger" onClick={() => remove(f)}><Trash2 size={13} /></button>}
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
        <input className="input" placeholder="key (e.g. team)" value={draft.key} onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))} />
        <input className="input" placeholder="Label" value={draft.label} onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
        <select className="input" value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
          {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {draft.type === 'select' && <input className="input" placeholder="Options (comma separated)" value={draft.options} onChange={(e) => setDraft((d) => ({ ...d, options: e.target.value }))} />}
        <label className="admin-toggle small"><input type="checkbox" checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} /><span>Required</span></label>
        <button type="submit" className="btn btn-primary"><Plus size={15} /> Add field</button>
      </form>
    </section>
  );
}

const defaultFieldDraft = () => ({
  key: '',
  label: '',
  type: 'text',
  options: '',
  required: false,
  sort_order: 0,
  active: true,
});

/* ---------------- Settings (app config) ---------------- */
function SettingsTab({ onToast }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('app_config').select('config').eq('id', true).maybeSingle();
    if (data?.config) setConfig(data.config);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (key, val) => setConfig((c) => ({ ...(c || {}), [key]: val }));

  const saveAll = async () => {
    setSaving(true);
    const { error } = await supabase.from('app_config').update({ config }).eq('id', true);
    setSaving(false);
    if (error) return onToast?.('Could not save settings: ' + error.message, 'warning');
    await logAudit(user, 'config.update', 'app_config', true, config);
    onToast?.('Settings saved', 'success');
  };

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-icon"><Settings2 size={18} /></span>
        <div>
          <h3>Application settings</h3>
          <p>Global configuration that applies to everyone.</p>
        </div>
      </div>

      <div className="admin-form">
        <label className="admin-toggle">
          <input type="checkbox" checked={!config || config.registration_open !== false} onChange={(e) => set('registration_open', e.target.checked)} />
          <span>
            <strong>Open registration</strong>
            <small>Allow new users to create accounts. Turn off to close the sign-up form.</small>
          </span>
        </label>

        <label className="admin-toggle">
          <input type="checkbox" checked={!!config?.maintenance} onChange={(e) => set('maintenance', e.target.checked)} />
          <span>
            <strong>Maintenance mode</strong>
            <small>Shows a maintenance notice to all users.</small>
          </span>
        </label>

        <div className="admin-field">
          <label className="form-label" htmlFor="admin-announcement">Announcement</label>
          <textarea
            id="admin-announcement"
            className="input"
            rows={2}
            placeholder="A message shown to all users (blank to hide)"
            value={config?.announcement || ''}
            onChange={(e) => set('announcement', e.target.value)}
          />
        </div>

        <div className="admin-form-actions">
          <button type="button" className="btn btn-primary" onClick={saveAll} disabled={!config || saving}>
            {saving && <Loader2 size={15} className="spin" />}
            Save settings
          </button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Audit Trail ---------------- */
const ACTIONS = [
  'auth.login', 'auth.login_failed', 'auth.login_blocked', 'auth.signup', 'auth.logout',
  'users.role_change', 'users.disable', 'users.enable', 'users.password_reset',
  'roles.create', 'roles.update', 'roles.delete', 'roles.permission_grant', 'roles.permission_revoke',
  'field.create', 'field.update', 'field.delete', 'config.update',
  'dash_type.create', 'dash_type.update', 'dash_type.delete',
];

function AuditTab({ onToast }) {
  const [logs, setLogs] = useState(null);
  const [filter, setFilter] = useState('');
  const [count, setCount] = useState(200);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(count);
      if (filter) q = q.eq('action', filter);
      const { data, error } = await q;
      if (!mounted) return;
      if (error) return onToast?.('Could not load audit trail: ' + error.message, 'warning');
      setLogs(data || []);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [filter, count, onToast]);

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <span className="admin-card-icon"><History size={18} /></span>
        <div>
          <h3>Audit trail</h3>
          <p>Authentication, account, role and configuration events.</p>
        </div>
      </div>

      <div className="admin-filter-row">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={500}>500</option>
        </select>
      </div>

      <div className="admin-table-wrap">
        {!logs ? (
          <p className="admin-loading"><Loader2 size={15} className="spin" /> Loading…</p>
        ) : logs.length === 0 ? (
          <p className="admin-empty">No audit entries.</p>
        ) : (
          <table className="admin-table audit-table">
            <thead>
              <tr><th>When</th><th>Actor</th><th>Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="admin-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.actor_email || l.actor_id || 'system'}</td>
                  <td><span className="admin-pill">{l.action}</span></td>
                  <td className="audit-details">{l.details ? JSON.stringify(l.details) : l.entity_type ? `${l.entity_type}${l.entity_id != null ? '#' + l.entity_id : ''}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}