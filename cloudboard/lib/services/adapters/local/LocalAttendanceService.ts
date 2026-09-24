import { IAttendanceService } from '../../contracts/IAttendanceService';
import {
  CBEvent,
  CreateEventDTO,
  AttendanceRecord,
  EventAttendanceStats,
} from '../../types';
import { INITIAL_EVENTS } from './seedData';

const EVENTS_STORE_KEY = 'cloudboard_events';
const ATTENDANCE_STORE_KEY = 'cloudboard_attendance';

type AttendanceStoreData = Record<string, Record<string, AttendanceRecord>>;

function getStoredEvents(): CBEvent[] {
  if (typeof window === 'undefined') return INITIAL_EVENTS;
  try {
    const raw = window.localStorage.getItem(EVENTS_STORE_KEY);
    if (raw) return JSON.parse(raw) as CBEvent[];
    window.localStorage.setItem(
      EVENTS_STORE_KEY,
      JSON.stringify(INITIAL_EVENTS)
    );
    return INITIAL_EVENTS;
  } catch {
    return INITIAL_EVENTS;
  }
}

function saveEvents(events: CBEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EVENTS_STORE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('[LocalAttendanceService] Failed to persist events', err);
  }
}

function getStoredAttendance(): AttendanceStoreData {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ATTENDANCE_STORE_KEY);
    return raw ? (JSON.parse(raw) as AttendanceStoreData) : {};
  } catch {
    return {};
  }
}

function saveAttendance(data: AttendanceStoreData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ATTENDANCE_STORE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[LocalAttendanceService] Failed to persist attendance', err);
  }
}

export class LocalAttendanceService implements IAttendanceService {
  async getAllEvents(): Promise<CBEvent[]> {
    return getStoredEvents();
  }

  async getEventById(eventId: string): Promise<CBEvent | null> {
    const events = getStoredEvents();
    return events.find((e) => e.id === eventId) ?? null;
  }

  async getEventAttendance(
    eventId: string
  ): Promise<Record<string, AttendanceRecord>> {
    const store = getStoredAttendance();
    return store[eventId] ?? {};
  }

  async markAttendance(
    record: AttendanceRecord,
    _actorId: string
  ): Promise<void> {
    const store = getStoredAttendance();
    if (!store[record.eventId]) {
      store[record.eventId] = {};
    }
    store[record.eventId][record.userId] = {
      ...record,
      markedAt: new Date().toISOString(),
    };
    saveAttendance(store);
  }

  async bulkMarkAttendance(
    records: AttendanceRecord[],
    _actorId: string
  ): Promise<void> {
    const store = getStoredAttendance();
    records.forEach((record) => {
      if (!store[record.eventId]) {
        store[record.eventId] = {};
      }
      store[record.eventId][record.userId] = {
        ...record,
        markedAt: new Date().toISOString(),
      };
    });
    saveAttendance(store);
  }

  async clearAttendance(
    eventId: string,
    userId: string,
    _actorId: string
  ): Promise<void> {
    const store = getStoredAttendance();
    if (store[eventId] && store[eventId][userId]) {
      delete store[eventId][userId];
      if (Object.keys(store[eventId]).length === 0) {
        delete store[eventId];
      }
      saveAttendance(store);
    }
  }

  async getEventStats(
    eventId: string,
    expectedAttendees: string[]
  ): Promise<EventAttendanceStats> {
    const map = await this.getEventAttendance(eventId);
    const total = expectedAttendees.length;

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    expectedAttendees.forEach((uid) => {
      const rec = map[uid];
      if (!rec) return;
      if (rec.status === 'present') present++;
      if (rec.status === 'absent') absent++;
      if (rec.status === 'late') late++;
      if (rec.status === 'excused') excused++;
    });

    const marked = present + absent + late + excused;
    const unmarked = total - marked;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      absent,
      late,
      excused,
      unmarked,
      attendanceRate,
    };
  }

  async createEvent(
    input: CreateEventDTO,
    actorId: string
  ): Promise<CBEvent> {
    const events = getStoredEvents();
    const newEvent: CBEvent = {
      ...input,
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdBy: actorId,
      createdAt: new Date().toISOString(),
    };
    const updated = [...events, newEvent];
    saveEvents(updated);
    return newEvent;
  }

  async updateEvent(
    id: string,
    updates: Partial<CBEvent>,
    _actorId: string
  ): Promise<CBEvent> {
    const events = getStoredEvents();
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) {
      throw new Error(`Event ${id} not found.`);
    }
    const updated = { ...events[idx], ...updates };
    events[idx] = updated;
    saveEvents(events);
    return updated;
  }

  async deleteEvent(id: string, _actorId: string): Promise<void> {
    const events = getStoredEvents();
    const updated = events.filter((e) => e.id !== id);
    saveEvents(updated);
  }
}
