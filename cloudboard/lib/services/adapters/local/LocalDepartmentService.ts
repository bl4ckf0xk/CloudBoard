import { IDepartmentService } from '../../contracts/IDepartmentService';
import { Department, DeptId } from '../../types';
import { INITIAL_DEPARTMENTS } from './seedData';

export class LocalDepartmentService implements IDepartmentService {
  async getAllDepartments(): Promise<Department[]> {
    return INITIAL_DEPARTMENTS;
  }

  async getAll(): Promise<Department[]> {
    return this.getAllDepartments();
  }

  async getDepartmentById(id: DeptId): Promise<Department | null> {
    return INITIAL_DEPARTMENTS.find((d) => d.id === id) ?? null;
  }
}
