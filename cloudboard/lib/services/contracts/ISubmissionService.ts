import {
  PointSubmission,
  CreateSubmissionDTO,
  DeptId,
  SubmissionStatus,
  SubmissionCategory,
} from '../types';

export interface SubmissionFilters {
  deptId?: DeptId;
  category?: SubmissionCategory | string;
  status?: SubmissionStatus;
}

export interface ISubmissionService {
  getSubmissions(filters?: SubmissionFilters): Promise<PointSubmission[]>;
  getSubmissionById(id: string): Promise<PointSubmission | null>;
  getSubmissionsForUser(userId: string): Promise<PointSubmission[]>;
  getPendingQueuesForDeptHead(deptId: DeptId): Promise<{
    homeDeptQueue: PointSubmission[];
    crossDeptQueue: PointSubmission[];
  }>;
  createSubmission(
    input: CreateSubmissionDTO,
    actorId: string
  ): Promise<PointSubmission>;
  approveSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission>;
  rejectSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission>;
  getTotalPointsAwarded(): Promise<number>;
}
