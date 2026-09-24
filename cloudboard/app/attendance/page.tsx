'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRole } from '@/lib/roleContext';
import {
  CBEvent,
  Department,
  User,
  AttendanceRecord,
  AttendanceStatus,
  EventStatus,
  DeptId,
} from '@/lib/services/types';
import {
  attendanceService,
  departmentService,
  userService,
} from '@/lib/services';
import { formatEventDate, daysFromNow } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string; icon: string }> = {
  present: { label: 'Present', color: 'var(--accent-green)', bg: 'var(--status-approved-bg)', icon: '✓' },
  absent: { label: 'Absent', color: 'var(--accent-red)', bg: 'var(--status-rejected-bg)', icon: '✕' },
  late: { label: 'Late', color: 'var(--accent-amber)', bg: 'var(--status-pending-bg)', icon: '◎' },
  excused: { label: 'Excused', color: 'var(--accent-violet)', bg: 'rgba(124,58,237,0.12)', icon: '~' },
};

const EVENT_STATUS_META = {
  upcoming: { label: 'Upcoming', color: 'var(--accent-amber)', icon: '⏳' },
  ongoing: { label: 'Ongoing', color: 'var(--accent-green)', icon: '●' },
  completed: { label: 'Completed', color: 'var(--text-muted)', icon: '✓' },
};

// ─── Event Form Modal (Create / Edit) ─────────────────────

interface EventFormProps {
  mode: 'create' | 'edit';
  initial?: CBEvent;
  currentUserId: string;
  currentUserDeptId: DeptId;
  isLeader: boolean;
  departments: Department[];
  allUsers: User[];
  onSave: (ev: CBEvent) => void;
  onCancel: () => void;
}

function EventFormModal({
  mode,
  initial,
  currentUserId,
  currentUserDeptId,
  isLeader,
  departments,
  allUsers,
  onSave,
  onCancel,
}: EventFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [deptId, setDeptId] = useState<DeptId>(initial?.deptId ?? currentUserDeptId);
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initial?.time ?? '10:00 AM');
  const [venue, setVenue] = useState(initial?.venue ?? '');
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? 'upcoming');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(initial?.expectedAttendees ?? []);
  const [error, setError] = useState('');

  const toggleAttendee = (uid: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const selectAll = () => setSelectedAttendees(allUsers.map((u) => u.id));
  const clearAll = () => setSelectedAttendees([]);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }
    if (!venue.trim()) {
      setError('Venue is required.');
      return;
    }
    if (selectedAttendees.length === 0) {
      setError('Select at least one attendee.');
      return;
    }

    const ev: CBEvent = {
      id: initial?.id ?? `event-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      deptId,
      date,
      time,
      venue: venue.trim(),
      status,
      expectedAttendees: selectedAttendees,
      createdBy: initial?.createdBy ?? currentUserId,
    };
    onSave(ev);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    outline: 'none',
    border: '1.5px solid var(--border-subtle)',
    background: 'var(--bg-card)',
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div className="modal-overlay">
      <div
        onClick={onCancel}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />
      <div
        className="log-modal animate-fade-in-up"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(22,163,74,0.15)',
                border: '1.5px solid rgba(22,163,74,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
              }}
            >
              {mode === 'create' ? '📅' : '✏️'}
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {mode === 'create' ? 'Create New Event' : 'Edit Event'}
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {mode === 'create' ? 'Add a new event to track attendance' : 'Update event details and attendees'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-secondary)',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
            }}
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: '20px 24px' }}>
          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Event Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Q3 All-Hands Meeting"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the event…"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 64, lineHeight: 1.6 }}
            />
          </div>

          {/* Dept + Status row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Organising Dept
              </label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value as DeptId)}
                disabled={!isLeader}
                style={{ ...inputStyle, cursor: isLeader ? 'pointer' : 'not-allowed', opacity: isLeader ? 1 : 0.7 }}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.icon} {d.shortName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EventStatus)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="upcoming">⏳ Upcoming</option>
                <option value="ongoing">● Ongoing</option>
                <option value="completed">✓ Completed</option>
              </select>
            </div>
          </div>

          {/* Date + Time + Venue row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Date *
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Time
              </label>
              <input type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder="10:00 AM" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 6 }}>
                Venue *
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => {
                  setVenue(e.target.value);
                  setError('');
                }}
                placeholder="Room/Hall name"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Attendees */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                Expected Attendees ({selectedAttendees.length} selected)
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={selectAll}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(22,163,74,0.3)',
                    background: 'var(--status-approved-bg)',
                    color: 'var(--status-approved-text)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  None
                </button>
              </div>
            </div>
            <div
              style={{
                maxHeight: 200,
                overflowY: 'auto',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                padding: '6px',
                background: 'var(--bg-secondary)',
              }}
            >
              {allUsers.map((u) => {
                const isChecked = selectedAttendees.includes(u.id);
                const dept = departments.find((d) => d.id === u.deptId);
                return (
                  <label
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 10px',
                      borderRadius: 7,
                      cursor: 'pointer',
                      background: isChecked ? 'rgba(22,163,74,0.1)' : 'transparent',
                      transition: 'background 0.15s ease',
                      marginBottom: 2,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleAttendee(u.id)}
                      className="cb-checkbox"
                    />
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: `${u.avatarColor}18`,
                        border: `1.5px solid ${u.avatarColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        color: u.avatarColor,
                      }}
                    >
                      {u.avatarInitials}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: isChecked ? 700 : 400, color: 'var(--text-primary)', flex: 1 }}>
                      {u.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{dept?.shortName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'var(--status-rejected-bg)',
                border: '1px solid var(--status-rejected-border)',
                fontSize: '0.78rem',
                color: 'var(--status-rejected-text)',
                marginBottom: 14,
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onCancel} className="cb-btn-ghost" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="cb-btn-primary" style={{ flex: 2 }}>
              {mode === 'create' ? '✓ Create Event' : '✓ Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Event card (left sidebar) ────────────────────────────

function EventCard({
  event,
  isSelected,
  attendance,
  dept,
  onClick,
  canManage,
  onEdit,
  onDelete,
}: {
  event: CBEvent;
  isSelected: boolean;
  attendance: Record<string, AttendanceRecord>;
  dept?: Department;
  onClick: () => void;
  canManage: boolean;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const statusMeta = EVENT_STATUS_META[event.status];
  const records = Object.values(attendance);
  const markedCount = records.length;
  const progress = event.expectedAttendees.length > 0 ? (markedCount / event.expectedAttendees.length) * 100 : 0;
  const days = daysFromNow(event.date);
  const relLabel =
    days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`;

  return (
    <div
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        border: isSelected ? `2px solid ${dept?.color ?? '#16a34a'}` : '1px solid var(--border-subtle)',
        background: isSelected ? 'rgba(22,163,74,0.08)' : 'var(--bg-secondary)',
        transition: 'all 0.2s ease',
        marginBottom: 6,
        boxShadow: isSelected ? '0 2px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: 1 }}>{dept?.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 3,
            }}
          >
            {event.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: statusMeta.color,
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                padding: '1px 5px',
              }}
            >
              {statusMeta.icon} {statusMeta.label}
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{relLabel}</span>
          </div>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onEdit}
              title="Edit event"
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                color: 'var(--accent-green)',
                fontSize: '0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✏
            </button>
            <button
              onClick={onDelete}
              title="Delete event"
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
                color: 'var(--accent-red)',
                fontSize: '0.65rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-muted)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: dept?.color ?? '#16a34a',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 4 }}>
        {markedCount}/{event.expectedAttendees.length} marked
      </p>
    </div>
  );
}

// ─── Stats bar ─────────────────────────────────────────────

function StatsBar({ stats }: { stats: { present: number; absent: number; late: number; excused: number; unmarked: number } }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
      {([
        { key: 'present', label: 'Present', value: stats.present, color: 'var(--accent-green)', bg: 'var(--status-approved-bg)' },
        { key: 'absent', label: 'Absent', value: stats.absent, color: 'var(--accent-red)', bg: 'var(--status-rejected-bg)' },
        { key: 'late', label: 'Late', value: stats.late, color: 'var(--accent-amber)', bg: 'var(--status-pending-bg)' },
        { key: 'excused', label: 'Excused', value: stats.excused, color: 'var(--accent-violet)', bg: 'rgba(124,58,237,0.1)' },
        { key: 'unmarked', label: 'Unmarked', value: stats.unmarked, color: 'var(--text-muted)', bg: 'var(--bg-muted)' },
      ] as const).map((item) => (
        <div
          key={item.key}
          style={{
            background: item.bg,
            border: `1.5px solid var(--border-subtle)`,
            borderRadius: 10,
            padding: '12px 8px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: item.color,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: 3,
            }}
          >
            {item.value}
          </p>
          <p style={{ fontSize: '0.62rem', color: item.color, fontWeight: 700 }}>{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Attendance row ────────────────────────────────────────

function AttendeeRow({
  user,
  dept,
  record,
  currentUserId,
  canManageAttendance,
  onMark,
}: {
  user: User;
  dept?: Department;
  record?: AttendanceRecord;
  currentUserId: string;
  canManageAttendance: boolean;
  onMark: (userId: string, status: AttendanceStatus | null) => void;
}) {
  const currentStatus = record?.status ?? null;
  const isSelf = user.id === currentUserId;
  const canEditRow = canManageAttendance || isSelf;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        background: currentStatus ? 'var(--bg-muted)' : 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        marginBottom: 6,
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: `${user.avatarColor}18`,
          border: `2px solid ${user.avatarColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: user.avatarColor,
          flexShrink: 0,
        }}
      >
        {user.avatarInitials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
          {user.name}
          {isSelf && (
            <span
              style={{
                marginLeft: 6,
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--accent-green)',
                background: 'var(--status-approved-bg)',
                border: '1px solid var(--status-approved-border)',
                borderRadius: 4,
                padding: '1px 5px',
              }}
            >
              You
            </span>
          )}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.67rem', color: 'var(--text-muted)' }}>
          <span>{dept?.icon}</span>
          <span>{dept?.shortName}</span>
        </div>
      </div>

      {canEditRow ? (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {(Object.keys(STATUS_META) as AttendanceStatus[]).map((status) => {
            const sm = STATUS_META[status];
            const isActive = currentStatus === status;
            return (
              <button
                key={status}
                title={sm.label}
                onClick={() => onMark(user.id, isActive ? null : status)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  border: `1.5px solid ${isActive ? sm.color : 'var(--border-subtle)'}`,
                  background: isActive ? sm.bg : 'var(--bg-primary)',
                  color: isActive ? sm.color : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                }}
              >
                {sm.icon}
              </button>
            );
          })}
        </div>
      ) : (
        <div style={{ flexShrink: 0 }}>
          {currentStatus ? (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: STATUS_META[currentStatus].color,
                background: STATUS_META[currentStatus].bg,
                border: `1px solid var(--border-subtle)`,
                borderRadius: 6,
                padding: '4px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {STATUS_META[currentStatus].icon} {STATUS_META[currentStatus].label}
            </span>
          ) : (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Unmarked
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attendance Panel ──────────────────────────────────────

function AttendancePanel({
  event,
  currentUserId,
  canManageAttendance,
  dept,
  allUsers,
  departments,
  onRefresh,
}: {
  event: CBEvent;
  currentUserId: string;
  canManageAttendance: boolean;
  dept?: Department;
  allUsers: User[];
  departments: Department[];
  onRefresh: () => void;
}) {
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 });
  const [filter, setFilter] = useState<AttendanceStatus | 'all' | 'unmarked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveFlash, setSaveFlash] = useState(false);

  const userMap = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const loadAttendance = useCallback(async () => {
    try {
      const [map, st] = await Promise.all([
        attendanceService.getEventAttendance(event.id),
        attendanceService.getEventStats(event.id, event.expectedAttendees),
      ]);
      setAttendanceMap(map);
      setStats(st);
    } catch (err) {
      console.error('[AttendancePanel] Failed to load event attendance', err);
    }
  }, [event.id, event.expectedAttendees]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleMark = async (userId: string, status: AttendanceStatus | null) => {
    try {
      if (status === null) {
        await attendanceService.clearAttendance(event.id, userId, currentUserId);
      } else {
        await attendanceService.markAttendance(
          {
            eventId: event.id,
            userId,
            status,
            markedById: currentUserId,
            markedAt: new Date().toISOString(),
          },
          currentUserId
        );
      }
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
      loadAttendance();
      onRefresh();
    } catch (err) {
      console.error('Failed to mark attendance', err);
    }
  };

  const handleBulkMark = async (status: AttendanceStatus) => {
    try {
      const records: AttendanceRecord[] = event.expectedAttendees.map((uid) => ({
        eventId: event.id,
        userId: uid,
        status,
        markedById: currentUserId,
        markedAt: new Date().toISOString(),
      }));
      await attendanceService.bulkMarkAttendance(records, currentUserId);
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1200);
      loadAttendance();
      onRefresh();
    } catch (err) {
      console.error('Failed to bulk mark attendance', err);
    }
  };

  const filteredAttendees = useMemo(() => {
    return event.expectedAttendees.filter((uid) => {
      const user = userMap.get(uid);
      if (!user) return false;
      if (searchQuery && !user.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const rec = attendanceMap[uid];
      if (filter === 'all') return true;
      if (filter === 'unmarked') return !rec;
      return rec?.status === filter;
    });
  }, [event.expectedAttendees, userMap, attendanceMap, filter, searchQuery]);

  return (
    <div>
      {!canManageAttendance && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--bg-muted)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>💡</span>
          <span>
            <strong>Self-Service Attendance:</strong> You can view event attendance and mark your own status for this event.
          </span>
        </div>
      )}

      {/* Event header card */}
      <div className="glass-card" style={{ padding: '18px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '1.2rem' }}>{dept?.icon}</span>
              <span
                style={{
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: EVENT_STATUS_META[event.status].color,
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 5,
                  padding: '2px 8px',
                }}
              >
                {EVENT_STATUS_META[event.status].icon} {EVENT_STATUS_META[event.status].label}
              </span>
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>
              {event.name}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {event.description}
            </p>
          </div>
          {saveFlash && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 7,
                background: 'var(--status-approved-bg)',
                border: '1px solid var(--status-approved-border)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--status-approved-text)',
                flexShrink: 0,
              }}
            >
              ✓ Saved
            </div>
          )}
        </div>

        {/* Meta chips */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {[
            { icon: '📅', text: formatEventDate(event.date) },
            { icon: '🕐', text: event.time },
            { icon: '📍', text: event.venue },
            { icon: '👥', text: `${event.expectedAttendees.length} attendees` },
          ].map(({ icon, text }) => (
            <span
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 7,
                padding: '4px 10px',
              }}
            >
              {icon} {text}
            </span>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Controls */}
      <div className="glass-card" style={{ padding: '12px 14px', marginBottom: 12, borderRadius: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search attendees…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 160,
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: '0.8rem',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {(['all', 'present', 'absent', 'late', 'excused', 'unmarked'] as const).map((f) => {
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    outline: 'none',
                    border: `1px solid ${isActive ? 'var(--accent-green)' : 'var(--border-subtle)'}`,
                    background: isActive ? 'var(--status-approved-bg)' : 'var(--bg-primary)',
                    color: isActive ? 'var(--status-approved-text)' : 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          {canManageAttendance && (
            <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
              <button
                onClick={() => handleBulkMark('present')}
                className="cb-btn-primary"
                style={{ fontSize: '0.68rem', padding: '5px 11px' }}
              >
                ✓ All Present
              </button>
              <button
                onClick={() => handleBulkMark('absent')}
                className="cb-btn-ghost"
                style={{
                  fontSize: '0.68rem',
                  padding: '5px 11px',
                  color: 'var(--status-rejected-text)',
                  borderColor: 'var(--status-rejected-border)',
                }}
              >
                ✕ All Absent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Attendees list */}
      <div className="glass-card" style={{ padding: '8px', borderRadius: 12 }}>
        {filteredAttendees.length === 0 ? (
          <EmptyState
            icon="👥"
            title="No attendees found"
            description="No attendees match your current search or filter query."
          />
        ) : (
          <div style={{ padding: '6px' }}>
            {filteredAttendees.map((uid) => {
              const user = userMap.get(uid);
              if (!user) return null;
              const userDept = deptMap.get(user.deptId);
              return (
                <AttendeeRow
                  key={uid}
                  user={user}
                  dept={userDept}
                  record={attendanceMap[uid]}
                  currentUserId={currentUserId}
                  canManageAttendance={canManageAttendance}
                  onMark={handleMark}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────

export default function AttendancePage() {
  const { currentUser, isLeader, isDeptHead } = useRole();
  const canManageEvents = isLeader || isDeptHead;

  const [events, setEvents] = useState<CBEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CBEvent | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [attendanceSnap, setAttendanceSnap] = useState<Record<string, Record<string, AttendanceRecord>>>({});

  const loadData = useCallback(async () => {
    try {
      const [evts, depts, users] = await Promise.all([
        attendanceService.getAllEvents(),
        departmentService.getAllDepartments(),
        userService.getAllUsers(),
      ]);
      setEvents(evts);
      setDepartments(depts);
      setAllUsers(users);

      if (evts.length > 0 && !selectedEventId) {
        setSelectedEventId(evts[0].id);
      }

      const snapMap: Record<string, Record<string, AttendanceRecord>> = {};
      for (const e of evts) {
        snapMap[e.id] = await attendanceService.getEventAttendance(e.id);
      }
      setAttendanceSnap(snapMap);
    } catch (err) {
      console.error('[AttendancePage] Failed to load initial data', err);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? events[0];
  const selectedDept = departments.find((d) => d.id === selectedEvent?.deptId);

  const filteredEvents = useMemo(() => {
    if (deptFilter === 'all') return events;
    return events.filter((e) => e.deptId === deptFilter);
  }, [deptFilter, events]);

  const handleSaveEvent = async (ev: CBEvent) => {
    if (editingEvent) {
      await attendanceService.updateEvent(ev.id, ev, currentUser.id);
    } else {
      await attendanceService.createEvent(ev, currentUser.id);
      setSelectedEventId(ev.id);
    }
    setShowForm(false);
    setEditingEvent(undefined);
    loadData();
  };

  const handleDeleteEvent = async (id: string) => {
    await attendanceService.deleteEvent(id, currentUser.id);
    setDeleteConfirm(null);
    loadData();
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
              Attendance
            </h1>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-green)',
                background: 'var(--status-approved-bg)',
                border: '1px solid var(--status-approved-border)',
                borderRadius: 5,
                padding: '2px 8px',
              }}
            >
              Core Team+
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Mark and manage event attendance across departments
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {canManageEvents && (
            <button
              onClick={() => {
                setEditingEvent(undefined);
                setShowForm(true);
              }}
              className="cb-btn-primary"
              style={{ fontSize: '0.82rem' }}
            >
              + Create Event
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="cb-grid-attendance">
        {/* LEFT: Event list */}
        <div>
          <div style={{ marginBottom: 10 }}>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="cb-input"
              style={{ width: '100%', fontSize: '0.78rem', padding: '8px 12px' }}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </p>

          <div>
            {filteredEvents.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
                No events found
              </p>
            ) : (
              filteredEvents.map((event) => {
                const eventDept = departments.find((d) => d.id === event.deptId);
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    isSelected={event.id === selectedEventId}
                    attendance={attendanceSnap[event.id] ?? {}}
                    dept={eventDept}
                    onClick={() => setSelectedEventId(event.id)}
                    canManage={canManageEvents}
                    onEdit={(e) => {
                      e.stopPropagation();
                      setEditingEvent(event);
                      setShowForm(true);
                    }}
                    onDelete={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(event.id);
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Attendance panel */}
        {selectedEvent && (
          <AttendancePanel
            key={selectedEvent.id}
            event={selectedEvent}
            currentUserId={currentUser.id}
            canManageAttendance={canManageEvents}
            dept={selectedDept}
            allUsers={allUsers}
            departments={departments}
            onRefresh={loadData}
          />
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={() => setDeleteConfirm(null)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              background: 'var(--bg-card)',
              borderRadius: 16,
              padding: '28px',
              maxWidth: 380,
              width: '100%',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--status-rejected-bg)',
                  border: '2px solid var(--status-rejected-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto 12px',
                }}
              >
                🗑
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                Delete Event?
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                &ldquo;{events.find((e) => e.id === deleteConfirm)?.name}&rdquo; and all its attendance records will be removed.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} className="cb-btn-ghost" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEvent(deleteConfirm)}
                className="cb-btn-primary"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  borderColor: '#dc2626',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <EventFormModal
          mode={editingEvent ? 'edit' : 'create'}
          initial={editingEvent}
          currentUserId={currentUser.id}
          currentUserDeptId={currentUser.deptId}
          isLeader={isLeader}
          departments={departments}
          allUsers={allUsers}
          onSave={handleSaveEvent}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(undefined);
          }}
        />
      )}
    </div>
  );
}
