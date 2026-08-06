export const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f43f5e', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'];

export const REASON_COLORS = {
  PTO: '#10b981',
  Sick: '#f43f5e',
  Training: '#06b6d4',
  Personal: '#8b5cf6',
  Holiday: '#f59e0b',
  Other: '#94a3b8',
};

export function avatarColor(name) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';
}
