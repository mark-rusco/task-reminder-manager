import { supabase } from './supabase';

/**
 * Append an entry to the audit trail. Best-effort: never throws, so a
 * failed audit write cannot break the primary action.
 * @param {object} user            the authenticated user (or null)
 * @param {string} action          e.g. 'auth.login', 'users.role_change'
 * @param {string} [entityType]    e.g. 'profile', 'role', 'audit_logs'
 * @param {string|number} [entityId]
 * @param {object} [details]       free-form JSON
 */
export async function logAudit(user, action, entityType, entityId, details) {
  if (!supabase || !user) return;
  try {
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_email: user.email,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId != null ? String(entityId) : null,
      details: details ?? {},
    });
  } catch {
    // best-effort only
  }
}