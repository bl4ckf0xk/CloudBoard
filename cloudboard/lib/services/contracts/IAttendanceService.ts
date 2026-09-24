import {
  CBEvent,
  CreateEventDTO,
  AttendanceRecord,
  EventAttendanceStats,
} from '../types';

export interface IAttendanceService {
  getAllEvents(): Promise<CBEvent[]>;
  getEventById(eventId: string): Promise<CBEvent | null>;
  getEventAttendance(eventId: string): Promise<Record<string, AttendanceRecord>>;
  markAttendance(record: AttendanceRecord, actorId: string): Promise<void>;
  bulkMarkAttendance(records: AttendanceRecord[], actorId: string): Promise<void>;
  clearAttendance(eventId: string, userId: string, actorId: string): Promise<void>;
  getEventStats(eventId: string, expectedAttendees: string[]): Promise<EventAttendanceStats>;
  createEvent(input: CreateEventDTO, actorId: string): Promise<CBEvent>;
  updateEvent(id: string, updates: Partial<CBEvent>, actorId: string): Promise<CBEvent>;
  deleteEvent(id: string, actorId: string): Promise<void>;
}
