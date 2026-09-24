/**
 * lib/utils.ts
 * Shared helper functions, tokens, and metadata across CloudBoard.
 */

import { UserRole } from './services/types';

// ─── Role Ranks ──────────────────────────────────────────────
const BASE_ROLE_RANK: Record<UserRole, number> = {
  volunteer: 0,
  committee: 1,
  'dept-head': 2,
  leader: 3,
};

export const ROLE_RANK: Record<UserRole, number> = new Proxy(BASE_ROLE_RANK, {
  get(target, prop: string) {
    if (typeof prop === 'string' && prop in target) {
      return target[prop as UserRole];
    }
    return 0;
  },
});

export const ROLE_ORDER: UserRole[] = [
  'leader',
  'dept-head',
  'committee',
  'volunteer',
];

// ─── Role Labels & Descriptions ──────────────────────────────
export const DEFAULT_ROLE_META = {
  label: 'Volunteer',
  description: 'Can view department activity and mark own attendance',
};

const BASE_ROLE_META: Record<
  UserRole,
  { label: string; description: string }
> = {
  volunteer: {
    label: 'Volunteer',
    description: 'Can view department activity and mark own attendance',
  },
  committee: {
    label: 'Committee',
    description:
      'Committee member — view department activity, mark own attendance, submit recognition',
  },
  'dept-head': {
    label: 'Dept Head',
    description:
      'Full dept access, cross-dept visibility, mark department attendance, approve submissions',
  },
  leader: {
    label: 'Leader',
    description:
      'Org-wide access, approve all, override decisions, full attendance management',
  },
};

export const ROLE_META: Record<
  UserRole,
  { label: string; description: string }
> = new Proxy(BASE_ROLE_META, {
  get(target, prop: string) {
    if (typeof prop === 'string' && prop in target) {
      return target[prop as UserRole];
    }
    return {
      label: typeof prop === 'string' && prop ? prop.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Volunteer',
      description: 'Team member',
    };
  },
});

// ─── Category Metadata ───────────────────────────────────────
export const CATEGORY_META: Record<
  string,
  { icon: string; color: string; bg: string; border: string }
> = {
  collaboration: {
    icon: '🤝',
    color: '#16a34a',
    bg: 'var(--cat-collab-bg, rgba(22, 163, 74, 0.12))',
    border: 'var(--cat-collab-border, rgba(22, 163, 74, 0.25))',
  },
  innovation: {
    icon: '💡',
    color: '#15803d',
    bg: 'var(--cat-innov-bg, rgba(21, 128, 61, 0.12))',
    border: 'var(--cat-innov-border, rgba(21, 128, 61, 0.25))',
  },
  leadership: {
    icon: '⭐',
    color: '#ca8a04',
    bg: 'var(--cat-leader-bg, rgba(202, 138, 4, 0.12))',
    border: 'var(--cat-leader-border, rgba(202, 138, 4, 0.25))',
  },
  delivery: {
    icon: '🚀',
    color: '#059669',
    bg: 'var(--cat-delivery-bg, rgba(5, 150, 105, 0.12))',
    border: 'var(--cat-delivery-border, rgba(5, 150, 105, 0.25))',
  },
  culture: {
    icon: '🌟',
    color: '#dc2626',
    bg: 'var(--cat-culture-bg, rgba(220, 38, 38, 0.12))',
    border: 'var(--cat-culture-border, rgba(220, 38, 38, 0.25))',
  },
};

// ─── Role Badge Colors (Tokenized) ───────────────────────────
export const DEFAULT_BADGE_COLOR = {
  bg: 'var(--badge-volunteer-bg, rgba(100, 116, 139, 0.14))',
  text: 'var(--badge-volunteer-text, #64748b)',
  border: 'var(--badge-volunteer-border, rgba(100, 116, 139, 0.35))',
};

const BASE_BADGE_COLORS: Record<
  UserRole,
  { bg: string; text: string; border: string }
> = {
  leader: {
    bg: 'var(--badge-leader-bg, rgba(202, 138, 4, 0.14))',
    text: 'var(--badge-leader-text, #ca8a04)',
    border: 'var(--badge-leader-border, rgba(202, 138, 4, 0.35))',
  },
  'dept-head': {
    bg: 'var(--badge-depthead-bg, rgba(22, 163, 74, 0.14))',
    text: 'var(--badge-depthead-text, #16a34a)',
    border: 'var(--badge-depthead-border, rgba(22, 163, 74, 0.35))',
  },
  committee: {
    bg: 'var(--badge-committee-bg, rgba(99, 102, 241, 0.14))',
    text: 'var(--badge-committee-text, #6366f1)',
    border: 'var(--badge-committee-border, rgba(99, 102, 241, 0.35))',
  },
  volunteer: {
    bg: 'var(--badge-volunteer-bg, rgba(100, 116, 139, 0.14))',
    text: 'var(--badge-volunteer-text, #64748b)',
    border: 'var(--badge-volunteer-border, rgba(100, 116, 139, 0.35))',
  },
};

export const BADGE_COLORS: Record<
  UserRole,
  { bg: string; text: string; border: string }
> = new Proxy(BASE_BADGE_COLORS, {
  get(target, prop: string) {
    if (typeof prop === 'string' && prop in target) {
      return target[prop as UserRole];
    }
    return DEFAULT_BADGE_COLOR;
  },
});

export function getBadgeColors(role?: string) {
  if (!role) return DEFAULT_BADGE_COLOR;
  return BADGE_COLORS[role as UserRole] ?? DEFAULT_BADGE_COLOR;
}

export function getRoleMeta(role?: string) {
  if (!role) return DEFAULT_ROLE_META;
  return ROLE_META[role as UserRole] ?? DEFAULT_ROLE_META;
}

export function getRoleRank(role?: string): number {
  if (!role) return 0;
  return ROLE_RANK[role as UserRole] ?? 0;
}

// ─── Date Formatting Utilities ───────────────────────────────

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatEventDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff) || diff < 0) return 'Just now';
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(iso);
  } catch {
    return iso;
  }
}

export function daysFromNow(dateStr: string): number {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    return Math.floor((eventDate.getTime() - today.getTime()) / 86_400_000);
  } catch {
    return 0;
  }
}
