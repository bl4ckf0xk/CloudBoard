/**
 * lib/services/index.ts
 * Service Locator & Factory for CloudBoard.
 * Allows instant, swappable switching between 'local' and 'aws' backends.
 */

import { IUserService } from './contracts/IUserService';
import { IDepartmentService } from './contracts/IDepartmentService';
import { ISubmissionService } from './contracts/ISubmissionService';
import { IAttendanceService } from './contracts/IAttendanceService';

import { LocalUserService } from './adapters/local/LocalUserService';
import { LocalDepartmentService } from './adapters/local/LocalDepartmentService';
import { LocalSubmissionService } from './adapters/local/LocalSubmissionService';
import { LocalAttendanceService } from './adapters/local/LocalAttendanceService';

import { AwsUserService } from './adapters/aws/AwsUserService';
import { AwsDepartmentService } from './adapters/aws/AwsDepartmentService';
import { AwsSubmissionService } from './adapters/aws/AwsSubmissionService';

export * from './types';
export * from './contracts/IUserService';
export * from './contracts/IDepartmentService';
export * from './contracts/ISubmissionService';
export * from './contracts/IAttendanceService';
export * from './adapters/aws/awsClient';

const isAwsBackend = process.env.NEXT_PUBLIC_DATA_SOURCE === 'aws';

// Service instances (swappable between local and aws)
export const userService: IUserService = isAwsBackend
  ? new AwsUserService()
  : new LocalUserService();

export const departmentService: IDepartmentService = isAwsBackend
  ? new AwsDepartmentService()
  : new LocalDepartmentService();

export const submissionService: ISubmissionService = isAwsBackend
  ? new AwsSubmissionService()
  : new LocalSubmissionService();

export const attendanceService: IAttendanceService = new LocalAttendanceService();

