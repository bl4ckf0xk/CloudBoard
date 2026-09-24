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
import { INITIAL_SUBMISSIONS } from '../local/seedData';

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
  if (s === 'approved' || s === 'confirmed' || s === 'accepted' || s === 'completed') return 'approved';
  if (s === 'rejected' || s === 'denied' || s === 'declined') return 'rejected';
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

function cleanId(rawId?: any): string {
  if (!rawId) return '';
  return String(rawId).trim().replace(/^POINT#/i, '').replace(/^MEMBER#/i, '').replace(/^USER#/i, '');
}

export function mapAwsPointToSubmission(raw: any): PointSubmission {
  const id = raw.PK ? cleanId(raw.PK) : raw.id || `point-${Date.now()}`;
  const homeDept = normalizeDept(raw.submitted_by_dept || raw.home_dept);
  const targetDept = normalizeDept(raw.target_dept);
  const status = normalizeStatus(raw.status);
  const reason = raw.description || raw.reason || raw.title || 'Contribution recognition';
  const category = (raw.category as SubmissionCategory) || deriveCategory(raw.title, reason);
  const rawPoints = raw.points ?? raw.total_points ?? raw.points_requested ?? raw.point ?? raw.score ?? 0;
  const points = typeof rawPoints === 'number' ? rawPoints : parseInt(String(rawPoints) || '0', 10) || 0;

  const rawTarget =
    raw.target_user_id ||
    raw.targetUserId ||
    raw.target_user ||
    raw.targetUser ||
    raw.recipient ||
    raw.recipient_id ||
    raw.recipientId ||
    raw.user_id ||
    raw.userId ||
    raw.submitted_by ||
    raw.submitterId ||
    'user-unknown';

  const rawSubmitter =
    raw.submitted_by ||
    raw.submitterId ||
    raw.submitter ||
    raw.created_by ||
    raw.createdBy ||
    'user-unknown';

  return {
    id,
    submitterId: cleanId(rawSubmitter) || 'user-unknown',
    targetUserId: cleanId(rawTarget) || 'user-unknown',
    home_dept: homeDept,
    target_dept: targetDept,
    cross_dept: homeDept !== targetDept,
    points,
    reason,
    category,
    status,
    createdAt: raw.submitted_at || raw.createdAt || new Date().toISOString(),
    approvedBy: raw.approved_by || raw.approvedBy || raw.reviewed_by || raw.reviewer_id || raw.actioned_by,
    approvedByName: raw.approved_by_name || raw.approvedByName || raw.reviewer_name || raw.approver_name || raw.approved_by_username,
    reviewedAt: raw.reviewed_at || raw.reviewedAt || raw.approved_at || raw.updated_at,
    requestedApproverId: raw.requested_approver_id || raw.requestedApproverId,
    requestedApproverRole: raw.requested_approver_role || raw.requestedApproverRole,
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
      if (Array.isArray(rawList) && rawList.length > 0) {
        const subs = rawList.map(mapAwsPointToSubmission);
        this.cachedSubmissions = subs;
        this.lastFetch = now;
        return subs;
      }
      if (this.cachedSubmissions && this.cachedSubmissions.length > 0) {
        return this.cachedSubmissions;
      }
      return INITIAL_SUBMISSIONS;
    } catch (err: unknown) {
      logger.warn('[AwsSubmissionService] Failed to fetch submissions from AWS API, using fallback data:', err);
      if (!this.cachedSubmissions || this.cachedSubmissions.length === 0) {
        if (typeof window !== 'undefined') {
          try {
            const raw = window.localStorage.getItem('cloudboard_contributions');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                this.cachedSubmissions = parsed;
                return parsed;
              }
            }
          } catch {}
        }
        return INITIAL_SUBMISSIONS;
      }
      return this.cachedSubmissions;
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
      category: input.category,
      requested_approver_id: input.requestedApproverId,
      requested_approver_role: input.requestedApproverRole,
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

      if (typeof window !== 'undefined') {
        try {
          const current = this.cachedSubmissions;
          window.localStorage.setItem('cloudboard_contributions', JSON.stringify(current));
        } catch {}
      }

      return newSub;
    } catch (err: unknown) {
      logger.warn('[AwsSubmissionService] Failed to create submission via AWS API, using local fallback:', err);
      const fallbackSub: PointSubmission = {
        ...input,
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        submitterId: actorId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      this.cachedSubmissions = [fallbackSub, ...(this.cachedSubmissions || [])];

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            'cloudboard_contributions',
            JSON.stringify(this.cachedSubmissions)
          );
        } catch {}
      }

      return fallbackSub;
    }
  }

  async approveSubmission(
    submissionId: string,
    approverId: string
  ): Promise<PointSubmission> {
    try {
      await awsFetch(`/points/${submissionId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ approved_by: approverId }),
      });
    } catch (err: unknown) {
      logger.warn('[AwsSubmissionService] AWS approve API notice, continuing with local state update:', err);
    }

    const all = await this.getAllSubmissions();
    const idx = all.findIndex((s) => s.id === submissionId);
    let updatedSub: PointSubmission;

    if (idx !== -1) {
      updatedSub = {
        ...all[idx],
        status: 'approved',
        approvedBy: approverId,
        reviewedAt: new Date().toISOString(),
      };
      all[idx] = updatedSub;
      this.cachedSubmissions = [...all];
    } else {
      updatedSub = {
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
      this.cachedSubmissions = null;
    }

    // Persist submissions update and update target user points
    if (typeof window !== 'undefined') {
      try {
        if (this.cachedSubmissions) {
          window.localStorage.setItem('cloudboard_contributions', JSON.stringify(this.cachedSubmissions));
        }
        const rawUsers = window.localStorage.getItem('cloudboard_members');
        if (rawUsers) {
          const parsedUsers = JSON.parse(rawUsers);
          if (Array.isArray(parsedUsers)) {
            const targetLower = (updatedSub.targetUserId || '').toLowerCase();
            const uIdx = parsedUsers.findIndex(
              (u: any) =>
                (u.id && u.id.toLowerCase() === targetLower) ||
                (u.email && u.email.toLowerCase() === targetLower) ||
                (u.name && u.name.toLowerCase() === targetLower) ||
                (u.id && targetLower.includes(u.id.toLowerCase()))
            );
            if (uIdx !== -1) {
              parsedUsers[uIdx].totalPoints = (parsedUsers[uIdx].totalPoints || 0) + updatedSub.points;
              window.localStorage.setItem('cloudboard_members', JSON.stringify(parsedUsers));
              window.localStorage.setItem(`cloudboard_user_points_${parsedUsers[uIdx].id}`, String(parsedUsers[uIdx].totalPoints));
            }
          }
        }
        if (updatedSub.targetUserId) {
          const currentPts = parseInt(window.localStorage.getItem(`cloudboard_user_points_${updatedSub.targetUserId}`) || '0', 10);
          window.localStorage.setItem(`cloudboard_user_points_${updatedSub.targetUserId}`, String(currentPts + updatedSub.points));
        }
        window.dispatchEvent(new CustomEvent('contribution-submitted', { detail: updatedSub }));
      } catch (e) {
        logger.warn('[AwsSubmissionService] Local storage update error:', e);
      }
    }

    return updatedSub;
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
