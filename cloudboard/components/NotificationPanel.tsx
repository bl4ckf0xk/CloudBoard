'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CBNotification } from '@/lib/notifications';
import { relativeTime } from '@/lib/utils';
import { Bell, CheckCheck, Trash2, Award, ShieldAlert, Calendar, Info, X } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: CBNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: CBNotification['type']) => {
    switch (type) {
      case 'points':
        return <Award size={16} style={{ color: 'var(--accent-amber)' }} />;
      case 'approval':
        return <ShieldAlert size={16} style={{ color: 'var(--accent-indigo)' }} />;
      case 'event':
        return <Calendar size={16} style={{ color: 'var(--accent-green)' }} />;
      default:
        return <Info size={16} style={{ color: 'var(--text-muted)' }} />;
    }
  };

  return (
    <div
      ref={panelRef}
      className="dropdown-glass animate-slide-down"
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 360,
        maxWidth: '92vw',
        padding: 0,
        zIndex: 150,
        boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={17} style={{ color: 'var(--accent-indigo)' }} />
          <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#ffffff',
                background: 'var(--accent-indigo)',
                borderRadius: 10,
                padding: '1px 6px',
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Mark all as read"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-indigo)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: 6,
              }}
            >
              <CheckCheck size={14} /> Mark read
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close notifications"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 8px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            <Bell size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
            <p style={{ fontSize: '0.84rem', fontWeight: 600 }}>No notifications</p>
            <p style={{ fontSize: '0.72rem', marginTop: 2 }}>You&apos;re all caught up!</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => onMarkRead(n.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 4,
                background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.07)',
                border: `1px solid ${n.read ? 'transparent' : 'rgba(99, 102, 241, 0.2)'}`,
                cursor: 'pointer',
                display: 'flex',
                gap: 10,
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {getIcon(n.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: n.read ? 600 : 700,
                      color: n.read ? 'var(--text-primary)' : 'var(--accent-indigo)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.title}
                  </p>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                    {relativeTime(n.timestamp)}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {n.message}
                </p>
                {n.link && (
                  <Link
                    href={n.link}
                    onClick={() => {
                      onMarkRead(n.id);
                      onClose();
                    }}
                    style={{
                      display: 'inline-block',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--accent-indigo)',
                      marginTop: 4,
                      textDecoration: 'none',
                    }}
                  >
                    View details →
                  </Link>
                )}
              </div>

              {!n.read && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent-indigo)',
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            padding: '8px 14px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={onClearAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 6px',
            }}
          >
            <Trash2 size={12} /> Clear all
          </button>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            CloudBoard System Notifications
          </span>
        </div>
      )}
    </div>
  );
}
