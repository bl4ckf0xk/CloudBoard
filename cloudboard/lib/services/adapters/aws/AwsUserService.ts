/**
 * lib/services/adapters/aws/AwsUserService.ts
 * AWS API Gateway & DynamoDB implementation of IUserService.
 */

import { IUserService } from '../../contracts/IUserService';
import { User, UserRole, DeptId } from '../../types';
import { awsFetch } from './awsClient';
import { logger } from '@/lib/logger';

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
  const totalPoints = typeof raw.total_points === 'number' ? raw.total_points : parseInt(raw.total_points || '0', 10) || 0;

  return {
    id,
    name: raw.name || name,
    email,
    avatarInitials: initials,
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

  async getAllUsers(): Promise<User[]> {
    const now = Date.now();
    if (this.cachedUsers && now - this.lastFetch < this.CACHE_TTL_MS) {
      return this.cachedUsers;
    }

    try {
      const data = await awsFetch<{ members?: any[]; Users?: any[] }>('/members');
      const rawList = data.members || data.Users || [];
      if (Array.isArray(rawList)) {
        const users = rawList.map(mapAwsMemberToUser);
        this.cachedUsers = users;
        this.lastFetch = now;
        return users;
      }
      return this.cachedUsers || [];
    } catch (err: unknown) {
      logger.warn('[AwsUserService] Failed to fetch users from AWS API:', err);
      return this.cachedUsers || [];
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
    return updatedUser;
  }
}
