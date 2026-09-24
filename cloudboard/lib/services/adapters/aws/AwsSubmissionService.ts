/**
 * lib/services/adapters/aws/AwsSubmissionService.ts
 * AWS API Gateway & DynamoDB implementation of ISubmissionService.
 */

import {
  ISubmissionService,
  SubmissionFilters,
} from '../../contracts/ISubmissionService';
import {
  PointSubmission,
  CreateSubmissionDTO,
  DeptId,
  SubmissionCategory,
  SubmissionStatus,
} from '../../types';
import { awsFetch } from './awsClient';
import { logger } from '@/lib/logger';

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

const DEPT_ID_TO_NAME: Record<DeptId, string> = {
  'marketing-design': 'Marketing & Design',
  'budget-io': 'Budget & IO',
  'delegate-handling': 'Delegate Handling',
  engineering: 'Engineering',
  'event-coordination': 'Event Coordination',
};

function normalizeDept(rawDept?: string): DeptId {
  if (!rawDept) return 'engineering';
  return DEPT_NAME_TO_ID[rawDept] || 'engineering';
}

function normalizeStatus(rawStatus?: string): SubmissionStatus {
  if (!rawStatus) return 'pending';
  const s = rawStatus.toLowerCase().trim();
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

function deriveCategory(title = '', reason = ''): SubmissionCategory {
  const text = `${title} ${reason}`.toLowerCase();
  if (text.includes('innovat') || text.includes('idea')) return 'innovation';
  if (text.includes('lead') || text.includes('direct')) return 'leadership';
  if (text.includes('deliv') || text.includes('task') || text.includes('code')) return 'delivery';
  if (text.includes('cultur') || text.includes('event')) return 'culture';
  return 'collaboration';
}

export function mapAwsPointToSubmission(raw: any): PointSubmission {
  const id = raw.PK ? raw.PK.replace('POINT#', '') : raw.id || `point-${Date.now()}`;
  const homeDept = normalizeDept(raw.submitted_by_dept || raw.home_dept);
  const targetDept = normalizeDept(raw.target_dept);
  const status = normalizeStatus(raw.status);
  const reason = raw.description || raw.reason || raw.title || 'Contribution recognition';
  const category = (raw.category as SubmissionCategory) || deriveCategory(raw.title, reason);

  return {
    id,
    submitterId: raw.submitted_by || raw.submitterId || 'user-unknown',
    targetUserId: raw.target_user_id || raw.targetUserId || raw.submitted_by || 'user-unknown',
    home_dept: homeDept,
    target_dept: targetDept,
    cross_dept: homeDept !== targetDept,
    points: typeof raw.points === 'number' ? raw.points : parseInt(raw.points || '0', 10) || 0,
    reason,
    category,
    status,
    createdAt: raw.submitted_at || raw.createdAt || new Date().toISOString(),
    approvedBy: raw.approved_by || raw.approvedBy,
  };
}

export class AwsSubmissionService implements ISubmissionService {
  private cachedSubmissions: PointSubmission[] | null = null;
  private lastFetch = 0;
  private readonly CACHE_TTL_MS = 8_000;

  async getAllSubmissions(): Promise<PointSubmission[]> {
    const now = Date.now();
    if (this.cachedSubmissions && now - this.lastFetch < this.CACHE_TTL_MS) {
      return this.cachedSubmissions;
    }

    try {
      const data = await awsFetch<{ points?: any[] }>('/points');
      const rawList = data.points || [];
      if (Array.isArray(rawList)) {
        const subs = rawList.map(mapAwsPointToSubmission);
        this.cachedSubmissions = subs;
        this.lastFetch = now;
        return subs;
      }
      return this.cachedSubmissions || [];
    } catch (err: unknown) {
      logger.warn('[AwsSubmissionService] Failed to fetch submissions from AWS API:', err);
      return this.cachedSubmissions || [];
    }
  }

  async getSubmissions(filters?: SubmissionFilters): Promise<PointSubmission[]> {
    let subs = await this.getAllSubmissions();
    if (filters) {
      if (filters.deptId && filters.deptId !== ('all' as any)) {
        subs = subs.filter(
          (s) => s.home_dept === filters.deptId || s.target_dept === filters.deptId
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
    const all = await this.getAllSubmissions();
    return all.find((s) => s.id === id) ?? null;
  }

  async getSubmissionsForUser(userId: string): Promise<PointSubmission[]> {
    const all = await this.getAllSubmissions();
    return all.filter((s) => s.targetUserId === userId || s.submitterId === userId);
  }

  async getPendingQueuesForDeptHead(deptId: DeptId): Promise<{
    homeDeptQueue: PointSubmission[];
    crossDeptQueue: PointSubmission[];
  }> {
    const all = await this.getAllSubmissions();
    const homeDeptQueue = all.filter(
      (s) => s.home_dept === deptId && s.status === 'pending'
    );
    const crossDeptQueue = all.filter(
      (s) => s.target_dept === deptId && s.cross_dept && s.status === 'pending'
    );
    return { homeDeptQueue, crossDeptQueue };
  }

  async createSubmission(
    input: CreateSubmissionDTO,
    actorId: string
  ): Promise<PointSubmission> {
    const targetDeptName = DEPT_ID_TO_NAME[input.target_dept] || 'Engineering';
    const payload = {
      title: input.reason.slice(0, 50),
      description: input.reason,
      points_requested: input.points,
      target_dept: targetDeptName,
      target_user_id: input.targetUserId,
    };

    try {
      const res = await awsFetch<{ point?: any; message?: string }>('/points', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const newSub: PointSubmission = res.point
        ? mapAwsPointToSubmission(res.point)
        : {
            ...input,
            id: `sub-${Date.now()}`,
            submitterId: actorId,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
      this.cachedSubmissions = [newSub, ...(this.cachedSubmissions || [])];
      return newSub;
    } catch (err: unknown) {
      logger.error('[AwsSubmissionService] Failed to create submission via AWS API', err);
      throw err;
    }
  }

  async approveSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission> {
    await awsFetch(`/points/${submissionId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved_by: approverId }),
    });

    const all = await this.getAllSubmissions();
    const idx = all.findIndex((s) => s.id === submissionId);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        status: 'approved',
        approvedBy: approverId,
        reviewedAt: new Date().toISOString(),
      };
      this.cachedSubmissions = [...all];
      return all[idx];
    }
    
    // Invalidate cache to force next reload
    this.cachedSubmissions = null;
    return {
      id: submissionId,
      submitterId: 'user-unknown',
      targetUserId: 'user-unknown',
      home_dept: 'engineering',
      target_dept: 'engineering',
      cross_dept: false,
      points: 0,
      reason: 'Approved',
      category: 'collaboration',
      status: 'approved',
      createdAt: new Date().toISOString(),
      approvedBy: approverId,
      reviewedAt: new Date().toISOString(),
    };
  }

  async rejectSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission> {
    await awsFetch(`/points/${submissionId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejected_by: approverId }),
    });

    const all = await this.getAllSubmissions();
    const idx = all.findIndex((s) => s.id === submissionId);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        status: 'rejected',
        approvedBy: approverId,
        reviewedAt: new Date().toISOString(),
      };
      this.cachedSubmissions = [...all];
      return all[idx];
    }
    
    this.cachedSubmissions = null;
    return {
      id: submissionId,
      submitterId: 'user-unknown',
      targetUserId: 'user-unknown',
      home_dept: 'engineering',
      target_dept: 'engineering',
      cross_dept: false,
      points: 0,
      reason: 'Rejected',
      category: 'collaboration',
      status: 'rejected',
      createdAt: new Date().toISOString(),
      approvedBy: approverId,
      reviewedAt: new Date().toISOString(),
    };
  }

  async getTotalPointsAwarded(): Promise<number> {
    const all = await this.getAllSubmissions();
    return all
      .filter((s) => s.status === 'approved')
      .reduce((sum, s) => sum + s.points, 0);
  }
}
