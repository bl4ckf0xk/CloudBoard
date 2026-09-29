import { IUserService } from '../../contracts/IUserService';
import { User, UserRole, DeptId } from '../../types';
import { INITIAL_USERS } from './seedData';

const STORE_KEY = 'cloudboard_members';

const VALID_ROLES = new Set<UserRole>(['volunteer', 'committee', 'dept-head', 'leader']);

function sanitizeUser(u: any): User {
  return {
    ...u,
    role: VALID_ROLES.has(u?.role) ? u.role : 'volunteer',
  };
}

export function migrateUsers(rawUsers: any[]): User[] {
  if (!Array.isArray(rawUsers) || rawUsers.length === 0) return INITIAL_USERS;

  let hasMarcus = false;
  const migrated = rawUsers.map((u: any) => {
    const sanitized = sanitizeUser(u);
    // Ensure user-08 is Marcus Vance (Dept Head of Engineering)
    if (
      sanitized.id === 'user-08' ||
      (sanitized.email && sanitized.email.toLowerCase().includes('marcus')) ||
      (sanitized.name && sanitized.name.toLowerCase().includes('marcus')) ||
      (sanitized.name && sanitized.name.toLowerCase().includes('nikhil'))
    ) {
      hasMarcus = true;
      return {
        ...sanitized,
        id: 'user-08',
        name: 'Marcus Vance',
        email: 'marcus.v@cloudboard.internal',
        avatarInitials: 'MV',
        role: 'dept-head' as UserRole,
        deptId: 'engineering' as DeptId,
        avatarColor: '#4338ca',
      };
    }

    // Ensure user-20 (Arjun Krishnamurthy / Leader / "me") is removed from Engineering roster
    if (
      sanitized.id === 'user-20' ||
      (sanitized.email && sanitized.email.toLowerCase().includes('arjun')) ||
      (sanitized.name && sanitized.name.toLowerCase().includes('arjun'))
    ) {
      return {
        ...sanitized,
        deptId: '' as any,
      };
    }

    // Any leader should have org-wide authority, not assigned to Engineering department
    if (sanitized.role === 'leader' && sanitized.deptId === 'engineering') {
      return {
        ...sanitized,
        deptId: '' as any,
      };
    }

    // Check if points override was recorded
    if (typeof window !== 'undefined') {
      const explicitPts = window.localStorage.getItem(`cloudboard_user_points_${sanitized.id}`);
      if (explicitPts !== null) {
        sanitized.totalPoints = Math.max(0, parseInt(explicitPts, 10) || 0);
      }
    }

    return sanitized;
  });

  if (!hasMarcus) {
    migrated.push({
      id: 'user-08',
      name: 'Marcus Vance',
      email: 'marcus.v@cloudboard.internal',
      avatarInitials: 'MV',
      role: 'dept-head',
      deptId: 'engineering',
      joinDate: '2024-03-20',
      totalPoints: 58,
      avatarColor: '#4338ca',
    });
  }

  return migrated;
}

export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return migrateUsers(INITIAL_USERS);
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const migrated = migrateUsers(parsed);
        window.localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    const initialMigrated = migrateUsers(INITIAL_USERS);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(initialMigrated));
    return initialMigrated;
  } catch {
    return migrateUsers(INITIAL_USERS);
  }
}

export function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('[LocalUserService] Failed to persist users', err);
  }
}

export class LocalUserService implements IUserService {
  async getCurrentUser(): Promise<User | null> {
    const users = getStoredUsers();
    // Default simulated session user: Arjun Krishnamurthy (Leader)
    return users.find((u) => u.role === 'leader') ?? users[0] ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    const users = getStoredUsers();
    return users.find((u) => u.id === id) ?? null;
  }

  async getAllUsers(): Promise<User[]> {
    return getStoredUsers();
  }

  async getUsersByDepartment(deptId: DeptId): Promise<User[]> {
    const users = getStoredUsers();
    return users.filter((u) => u.deptId === deptId);
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const users = getStoredUsers();
    return users.filter((u) => u.role === role);
  }

  async overrideMemberPoints(
    _actorId: string,
    targetUserId: string,
    newPoints: number,
    _reason?: string
  ): Promise<User> {
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === targetUserId);
    if (idx === -1) {
      throw new Error(`User with ID ${targetUserId} not found.`);
    }
    const updatedUser: User = {
      ...users[idx],
      totalPoints: Math.max(0, newPoints),
    };
    users[idx] = updatedUser;
    saveUsers(users);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`cloudboard_user_points_${targetUserId}`, String(Math.max(0, newPoints)));
    }
    return updatedUser;
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User> {
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    const updatedUser: User = {
      ...users[idx],
      avatarUrl,
    };
    users[idx] = updatedUser;
    saveUsers(users);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('cloudboard_user_avatar');
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
        console.warn('[LocalUserService] Failed to store avatar in localStorage', e);
      }
    }

    return updatedUser;
  }

  invalidateCache(): void {
    // Local storage is synchronous; no in-memory cache to invalidate
  }
}

