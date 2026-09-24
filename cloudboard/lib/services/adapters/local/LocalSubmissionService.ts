import {
  ISubmissionService,
  SubmissionFilters,
} from '../../contracts/ISubmissionService';
import {
  PointSubmission,
  CreateSubmissionDTO,
  DeptId,
} from '../../types';
import { INITIAL_SUBMISSIONS } from './seedData';

const STORE_KEY = 'cloudboard_contributions';

function getStoredSubmissions(): PointSubmission[] {
  if (typeof window === 'undefined') return INITIAL_SUBMISSIONS;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as PointSubmission[];
    window.localStorage.setItem(
      STORE_KEY,
      JSON.stringify(INITIAL_SUBMISSIONS)
    );
    return INITIAL_SUBMISSIONS;
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

function saveSubmissions(submissions: PointSubmission[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(submissions));
  } catch (err) {
    console.error('[LocalSubmissionService] Failed to persist submissions', err);
  }
}

export class LocalSubmissionService implements ISubmissionService {
  async getAllSubmissions(): Promise<PointSubmission[]> {
    return getStoredSubmissions();
  }

  async getSubmissions(
    filters?: SubmissionFilters
  ): Promise<PointSubmission[]> {
    let subs = getStoredSubmissions();
    if (filters) {
      if (filters.deptId && filters.deptId !== ('all' as any)) {
        subs = subs.filter(
          (s) =>
            s.home_dept === filters.deptId || s.target_dept === filters.deptId
        );
      }
      if (filters.category && filters.category !== 'all') {
        subs = subs.filter((s) => s.category === filters.category);
      }
      if (filters.status && filters.status !== ('all' as any)) {
        subs = subs.filter((s) => s.status === filters.status);
      }
    }
    return subs;
  }

  async getSubmissionById(id: string): Promise<PointSubmission | null> {
    const subs = getStoredSubmissions();
    return subs.find((s) => s.id === id) ?? null;
  }

  async getSubmissionsForUser(userId: string): Promise<PointSubmission[]> {
    const subs = getStoredSubmissions();
    return subs.filter(
      (s) => s.targetUserId === userId || s.submitterId === userId
    );
  }

  async getPendingQueuesForDeptHead(deptId: DeptId): Promise<{
    homeDeptQueue: PointSubmission[];
    crossDeptQueue: PointSubmission[];
  }> {
    const subs = getStoredSubmissions();
    const homeDeptQueue = subs.filter(
      (s) => s.home_dept === deptId && s.status === 'pending'
    );
    const crossDeptQueue = subs.filter(
      (s) =>
        s.target_dept === deptId && s.cross_dept && s.status === 'pending'
    );
    return { homeDeptQueue, crossDeptQueue };
  }

  async createSubmission(
    input: CreateSubmissionDTO,
    actorId: string
  ): Promise<PointSubmission> {
    const subs = getStoredSubmissions();
    const newSubmission: PointSubmission = {
      ...input,
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      submitterId: actorId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const updated = [newSubmission, ...subs];
    saveSubmissions(updated);
    return newSubmission;
  }

  async approveSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission> {
    const subs = getStoredSubmissions();
    const idx = subs.findIndex((s) => s.id === submissionId);
    if (idx === -1) {
      throw new Error(`Submission ${submissionId} not found.`);
    }
    const updated: PointSubmission = {
      ...subs[idx],
      status: 'approved',
      approvedBy: approverId,
      reviewedAt: new Date().toISOString(),
    };
    subs[idx] = updated;
    saveSubmissions(subs);

    // Update target member's points
    const targetUserId = updated.targetUserId;
    const pointsAwarded = updated.points;
    if (typeof window !== 'undefined') {
      try {
        const rawUsers = window.localStorage.getItem('cloudboard_members');
        if (rawUsers) {
          const parsedUsers = JSON.parse(rawUsers);
          if (Array.isArray(parsedUsers)) {
            const uIdx = parsedUsers.findIndex((u: any) => u.id === targetUserId);
            if (uIdx !== -1) {
              parsedUsers[uIdx].totalPoints = (parsedUsers[uIdx].totalPoints || 0) + pointsAwarded;
              window.localStorage.setItem('cloudboard_members', JSON.stringify(parsedUsers));
            }
          }
        }
      } catch (err) {
        console.error('[LocalSubmissionService] Failed to update member points', err);
      }
    }

    return updated;
  }

  async rejectSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission> {
    const subs = getStoredSubmissions();
    const idx = subs.findIndex((s) => s.id === submissionId);
    if (idx === -1) {
      throw new Error(`Submission ${submissionId} not found.`);
    }
    const updated: PointSubmission = {
      ...subs[idx],
      status: 'rejected',
      approvedBy: approverId,
      reviewedAt: new Date().toISOString(),
    };
    subs[idx] = updated;
    saveSubmissions(subs);
    return updated;
  }

  async getTotalPointsAwarded(): Promise<number> {
    const subs = getStoredSubmissions();
    return subs
      .filter((s) => s.status === 'approved')
      .reduce((sum, s) => sum + s.points, 0);
  }
}
