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

function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(sanitizeUser);
      }
    }
    window.localStorage.setItem(STORE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

function saveUsers(users: User[]): void {
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
    return updatedUser;
  }

  invalidateCache(): void {
    // Local storage is synchronous; no in-memory cache to invalidate
  }
}

