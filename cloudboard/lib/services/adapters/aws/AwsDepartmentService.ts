/**
 * lib/services/adapters/aws/AwsDepartmentService.ts
 * AWS Department implementation of IDepartmentService.
 */

import { IDepartmentService } from '../../contracts/IDepartmentService';
import { Department, DeptId } from '../../types';
import { INITIAL_DEPARTMENTS } from '../local/seedData';
import { AwsUserService } from './AwsUserService';

export class AwsDepartmentService implements IDepartmentService {
  private userService = new AwsUserService();

  async getAllDepartments(): Promise<Department[]> {
    try {
      const users = await this.userService.getAllUsers();
      // Dynamically calculate live member counts per department
      return INITIAL_DEPARTMENTS.map((dept) => {
        const count = users.filter((u) => u.deptId === dept.id).length;
        const head = users.find((u) => u.deptId === dept.id && u.role === 'dept-head');
        return {
          ...dept,
          memberCount: count > 0 ? count : dept.memberCount,
          headUserId: head ? head.id : dept.headUserId,
        };
      });
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  }

  async getAll(): Promise<Department[]> {
    return this.getAllDepartments();
  }

  async getDepartmentById(id: DeptId): Promise<Department | null> {
    const depts = await this.getAllDepartments();
    return depts.find((d) => d.id === id) ?? null;
  }
}
