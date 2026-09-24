import { Department, DeptId } from '../types';

export interface IDepartmentService {
  getAllDepartments(): Promise<Department[]>;
  getAll?(): Promise<Department[]>;
  getDepartmentById(id: DeptId): Promise<Department | null>;
}
