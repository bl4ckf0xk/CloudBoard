/**
 * lib/services/types.ts
 * Unified domain models and Data Transfer Objects (DTOs) for CloudBoard.
 * Prepared for drop-in AWS DynamoDB / AppSync / Cognito integration.
 */

export type DeptId =
  | 'marketing-design'
  | 'budget-io'
  | 'delegate-handling'
  | 'engineering'
  | 'event-coordination';

export type UserRole = 'volunteer' | 'committee' | 'dept-head' | 'leader';

export interface Department {
  id: DeptId;
  name: string;
  shortName: string;
  color: string;
  bgGradient: string;
  icon: string;
  memberCount: number;
  headUserId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  avatarUrl?: string;
  role: UserRole;
  deptId: DeptId;
  joinDate: string;
  totalPoints: number;
  avatarColor: string;
}

export type SubmissionCategory =
  | 'collaboration'
  | 'innovation'
  | 'leadership'
  | 'delivery'
  | 'culture';

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface PointSubmission {
  id: string;
  submitterId: string;
  targetUserId: string;
  home_dept: DeptId;
  target_dept: DeptId;
  cross_dept: boolean;
  points: number;
  reason: string;
  category: SubmissionCategory;
  status: SubmissionStatus;
  createdAt: string;
  approvedBy?: string;
  approvedByName?: string;
  reviewedAt?: string;
  requestedApproverId?: string;
  requestedApproverRole?: 'dept-head' | 'leader';
}

export interface CreateSubmissionDTO {
  targetUserId: string;
  home_dept: DeptId;
  target_dept: DeptId;
  cross_dept: boolean;
  points: number;
  reason: string;
  category: SubmissionCategory;
  requestedApproverId?: string;
  requestedApproverRole?: 'dept-head' | 'leader';
}

export type EventStatus = 'upcoming' | 'ongoing' | 'completed';

export interface CBEvent {
  id: string;
  name: string;
  description: string;
  deptId: DeptId;
  date: string;
  time: string;
  venue: string;
  status: EventStatus;
  expectedAttendees: string[];
  createdBy: string;
  createdAt?: string;
}

export interface CreateEventDTO {
  name: string;
  description: string;
  deptId: DeptId;
  date: string;
  time: string;
  venue: string;
  status: EventStatus;
  expectedAttendees: string[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  eventId: string;
  userId: string;
  status: AttendanceStatus;
  markedById: string;
  markedAt: string;
  note?: string;
}

export interface EventAttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  unmarked: number;
  attendanceRate: number;
}
