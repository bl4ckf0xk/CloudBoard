import { User, UserRole, DeptId } from '../types';

export interface IUserService {
  getCurrentUser(): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  getUsersByDepartment(deptId: DeptId): Promise<User[]>;
  getUsersByRole(role: UserRole): Promise<User[]>;
  overrideMemberPoints(
    actorId: string,
    targetUserId: string,
    newPoints: number,
    reason?: string
  ): Promise<User>;
}
