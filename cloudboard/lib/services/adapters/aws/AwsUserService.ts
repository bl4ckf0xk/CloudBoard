/**
 * lib/services/adapters/aws/AwsUserService.ts
 * AWS API Gateway & DynamoDB implementation of IUserService.
 */

import { IUserService } from '../../contracts/IUserService';
import { User, UserRole, DeptId } from '../../types';
import { awsFetch } from './awsClient';
import { logger } from '@/lib/logger';
import { INITIAL_USERS } from '../local/seedData';
import { migrateUsers } from '../local/LocalUserService';

// Map Department names from DynamoDB to CloudBoard DeptId tokens
const DEPT_NAME_TO_ID: Record<string, DeptId> = {
  'Marketing & Design': 'marketing-design',
  'Budget & IO': 'budget-io',
  'Delegate Handling': 'delegate-handling',
  Engineering: 'engineering',
  'Event Coordination': 'event-coordination',
  'marketing-design': 'marketing-design',
  'budget-io': 'budget-io',
  'delegate-handling': 'delegate-handling',
  engineering: 'engineering',
  'event-coordination': 'event-coordination',
};

const DEPT_COLORS: Record<DeptId, string> = {
  'marketing-design': '#f59e0b',
  'budget-io': '#10b981',
  'delegate-handling': '#8b5cf6',
  engineering: '#6366f1',
  'event-coordination': '#f43f5e',
};

function normalizeRole(rawRole?: string): UserRole {
  if (!rawRole) return 'volunteer';
  const r = rawRole.toLowerCase().trim();
  if (r === 'leader') return 'leader';
  if (r === 'dept_head' || r === 'dept-head' || r === 'head') return 'dept-head';
  if (r === 'committee') return 'committee';
  return 'volunteer';
}

function normalizeDept(rawDept?: string): DeptId {
  if (!rawDept) return 'engineering';
  return DEPT_NAME_TO_ID[rawDept] || 'engineering';
}

function parseEmailToName(email: string): { name: string; initials: string } {
  if (!email) return { name: 'Member', initials: 'MB' };
  const username = email.split('@')[0];
  const parts = username.split('.').filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const second = parts[1].replace(/[0-9]/g, '');
    const cleanSecond = second.charAt(0).toUpperCase() + second.slice(1);
    const name = cleanSecond ? `${first} ${cleanSecond}` : first;
    const initials = (first.charAt(0) + (cleanSecond.charAt(0) || first.charAt(1) || '')).toUpperCase();
    return { name, initials };
  }
  const name = username.charAt(0).toUpperCase() + username.slice(1);
  const initials = name.slice(0, 2).toUpperCase();
  return { name, initials };
}

export function mapAwsMemberToUser(raw: any): User {
  const id = raw.PK ? raw.PK.replace('MEMBER#', '') : raw.id || raw.sub || 'user-unknown';
  const email = raw.email || '';
  const { name, initials } = parseEmailToName(email);
  const deptId = normalizeDept(raw.dept || raw.department);
  const role = normalizeRole(raw.role);
  const rawPoints = raw.total_points ?? raw.totalPoints ?? raw.points ?? raw.Points ?? raw.point ?? raw.score ?? 0;
  const totalPoints = typeof rawPoints === 'number' ? rawPoints : parseInt(String(rawPoints) || '0', 10) || 0;
  
  let avatarUrl = raw.avatar_url || raw.avatarUrl || undefined;
  if (!avatarUrl && typeof window !== 'undefined') {
    try {
      avatarUrl =
        window.localStorage.getItem(`cloudboard_avatar_${id}`) ||
        (email ? window.localStorage.getItem(`cloudboard_avatar_by_email_${email.toLowerCase()}`) : null) ||
        undefined;
    } catch {
      // ignore
    }
  }

  return {
    id,
    name: raw.name || name,
    email,
    avatarInitials: initials,
    avatarUrl,
    role,
    deptId,
    joinDate: raw.join_date || raw.created_at || new Date().toISOString().split('T')[0],
    totalPoints,
    avatarColor: DEPT_COLORS[deptId] || '#6366f1',
  };
}

export class AwsUserService implements IUserService {
  private cachedUsers: User[] | null = null;
  private lastFetch = 0;
  private readonly CACHE_TTL_MS = 10_000; // 10 seconds

  invalidateCache(): void {
    this.cachedUsers = null;
    this.lastFetch = 0;
  }

  async getAllUsers(): Promise<User[]> {
    const now = Date.now();
    if (this.cachedUsers && now - this.lastFetch < this.CACHE_TTL_MS) {
      return this.cachedUsers;
    }

    try {
      const data = await awsFetch<{ members?: any[]; Users?: any[] }>('/members');
      const rawList = data.members || data.Users || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        const users = migrateUsers(rawList.map(mapAwsMemberToUser));
        this.cachedUsers = users;
        this.lastFetch = now;
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('cloudboard_members', JSON.stringify(users));
          } catch {}
        }
        return users;
      }
      if (this.cachedUsers && this.cachedUsers.length > 0) {
        return this.cachedUsers;
      }
      const initialMigrated = migrateUsers(INITIAL_USERS);
      this.cachedUsers = initialMigrated;
      return initialMigrated;
    } catch (err: unknown) {
      logger.warn('[AwsUserService] Failed to fetch users from AWS API, using fallback data:', err);
      if (!this.cachedUsers || this.cachedUsers.length === 0) {
        if (typeof window !== 'undefined') {
          try {
            const raw = window.localStorage.getItem('cloudboard_members');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const migrated = migrateUsers(parsed);
                this.cachedUsers = migrated;
                window.localStorage.setItem('cloudboard_members', JSON.stringify(migrated));
                return migrated;
              }
            }
          } catch {}
        }
        const initialMigrated = migrateUsers(INITIAL_USERS);
        this.cachedUsers = initialMigrated;
        return initialMigrated;
      }
      return this.cachedUsers;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find((u) => u.role === 'leader') ?? users[0] ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = await this.getAllUsers();
    return users.find((u) => u.id === id) ?? null;
  }

  async getUsersByDepartment(deptId: DeptId): Promise<User[]> {
    const users = await this.getAllUsers();
    return users.filter((u) => u.deptId === deptId);
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const users = await this.getAllUsers();
    return users.filter((u) => u.role === role);
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User> {
    const users = await this.getAllUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const updatedUser: User = {
      ...users[idx],
      avatarUrl,
    };
    users[idx] = updatedUser;
    this.cachedUsers = [...users];

    // Persist in localStorage for fallback/offline persistence strictly scoped to userId/email
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('cloudboard_user_avatar'); // Clean up any legacy generic avatar key
        window.localStorage.setItem('cloudboard_members', JSON.stringify(users));
        if (avatarUrl) {
          window.localStorage.setItem(`cloudboard_avatar_${userId}`, avatarUrl);
          if (updatedUser.email) {
            window.localStorage.setItem(`cloudboard_avatar_by_email_${updatedUser.email.toLowerCase()}`, avatarUrl);
          }
        } else {
          window.localStorage.removeItem(`cloudboard_avatar_${userId}`);
          if (updatedUser.email) {
            window.localStorage.removeItem(`cloudboard_avatar_by_email_${updatedUser.email.toLowerCase()}`);
          }
        }
        window.dispatchEvent(new CustomEvent('cloudboard-avatar-updated', { detail: { userId, avatarUrl } }));
      } catch (e) {
        logger.warn('[AwsUserService] Failed to persist avatar to localStorage:', e);
      }
    }

    try {
      await awsFetch(`/members/${userId}/avatar`, {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
    } catch (err: unknown) {
      logger.warn('[AwsUserService] AWS API avatar update notice, applied locally:', err);
    }

    return updatedUser;
  }

  async overrideMemberPoints(
    _actorId: string,
    targetUserId: string,
    newPoints: number,
    _reason?: string
  ): Promise<User> {
    const users = await this.getAllUsers();
    const idx = users.findIndex((u) => u.id === targetUserId);
    if (idx === -1) {
      throw new Error(`User with ID ${targetUserId} not found.`);
    }

    try {
      await awsFetch(`/members/${targetUserId}/points`, {
        method: 'PUT',
        body: JSON.stringify({
          total_points: Math.max(0, newPoints),
          reason: _reason || 'Leadership adjustment',
        }),
      });
    } catch (err: unknown) {
      logger.warn('[AwsUserService] AWS API points update returned notice, applying local state:', err);
    }

    const updatedUser: User = {
      ...users[idx],
      totalPoints: Math.max(0, newPoints),
    };
    users[idx] = updatedUser;
    this.cachedUsers = users;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('cloudboard_members', JSON.stringify(users));
        window.localStorage.setItem(`cloudboard_user_points_${targetUserId}`, String(Math.max(0, newPoints)));
      } catch {}
    }

    return updatedUser;
  }
}
