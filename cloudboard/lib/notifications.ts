/**
 * lib/notifications.ts
 * Notification state management and local storage store for CloudBoard.
 */

export interface CBNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'points' | 'approval' | 'system' | 'event';
  link?: string;
}

const STORAGE_KEY = 'cloudboard_notifications';

const DEFAULT_NOTIFICATIONS: CBNotification[] = [];

export function getStoredNotifications(): CBNotification[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function saveStoredNotifications(notifs: CBNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs));
    window.dispatchEvent(new Event('cloudboard-notifications-updated'));
  } catch (e) {
    console.error('[Notifications] Failed to save notifications', e);
  }
}

export function addNotification(notif: Omit<CBNotification, 'id' | 'timestamp' | 'read'>): CBNotification {
  const current = getStoredNotifications();
  const newNotif: CBNotification = {
    ...notif,
    id: `notif-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  saveStoredNotifications([newNotif, ...current]);
  return newNotif;
}

export function markAsRead(id: string): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveStoredNotifications(updated);
}

export function markAllAsRead(): void {
  const current = getStoredNotifications();
  const updated = current.map((n) => ({ ...n, read: true }));
  saveStoredNotifications(updated);
}

export function clearNotifications(): void {
  saveStoredNotifications([]);
}
