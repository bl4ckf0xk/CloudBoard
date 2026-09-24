import { CreateSubmissionDTO, CreateEventDTO } from '../services/types';

export function validateSubmissionInput(input: Partial<CreateSubmissionDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.targetUserId || typeof input.targetUserId !== 'string') {
    errors.push('Recipient member is required.');
  }

  if (!input.home_dept) {
    errors.push('Home department is required.');
  }

  if (!input.target_dept) {
    errors.push('Target department is required.');
  }

  if (typeof input.points !== 'number' || input.points < 1 || input.points > 100) {
    errors.push('Points must be a valid number between 1 and 100.');
  }

  if (!input.category) {
    errors.push('Category is required.');
  }

  if (!input.reason || input.reason.trim().length < 15) {
    errors.push('Reason must be at least 15 characters long.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateEventInput(input: Partial<CreateEventDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length < 3) {
    errors.push('Event name must be at least 3 characters.');
  }

  if (!input.deptId) {
    errors.push('Department is required.');
  }

  if (!input.date) {
    errors.push('Date is required.');
  }

  if (!input.time) {
    errors.push('Time is required.');
  }

  if (!input.venue || input.venue.trim().length < 2) {
    errors.push('Venue must be at least 2 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
