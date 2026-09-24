'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { User, PointSubmission, Department } from '@/lib/services/types';
import { submissionService, userService, departmentService } from '@/lib/services';
import { formatDate, relativeTime, CATEGORY_META } from '@/lib/utils';

function TimelineEvent({
  sub,
  isLast,
  userId,
  userMap,
  deptMap,
}: {
  sub: PointSubmission;
  isLast: boolean;
  userId: string;
  userMap: Map<string, User>;
  deptMap: Map<string, Department>;
}) {
  const isIncoming = sub.targetUserId === userId;
  const submitter = userMap.get(sub.submitterId);
  const target = userMap.get(sub.targetUserId);
  const targetDept = deptMap.get(sub.target_dept);
  const homeDept = deptMap.get(sub.home_dept);
  const catMeta = CATEGORY_META[sub.category] ?? {
    color: '#16a34a',
    icon: '◉',
    bg: 'var(--cat-collab-bg)',
    border: 'var(--cat-collab-border)',
  };

  const statusColor =
    sub.status === 'approved'
      ? 'var(--accent-green)'
      : sub.status === 'pending'
      ? 'var(--accent-amber)'
      : 'var(--accent-red)';

  return (
    <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
      {/* Content card */}
      <div
        style={{
          flex: 1,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '12px 14px',
          marginBottom: isLast ? 0 : 8,
          transition: 'border-color 0.2s ease, background 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          cursor: 'default',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Direction label */}
            <p
              style={{
                fontSize: '0.68rem',
                color: isIncoming ? 'var(--accent-green)' : 'var(--accent-indigo)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isIncoming ? 'Received from' : 'Submitted to'}
              <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--text-primary)' }}>
                {isIncoming ? submitter?.name.split(' ')[0] ?? '—' : target?.name.split(' ')[0] ?? '—'}
              </span>
            </p>
            {/* Reason */}
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {sub.reason}
            </p>
          </div>

          {/* Points badge */}
          <div
            style={{
              textAlign: 'right',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: isIncoming ? 'var(--accent-amber)' : 'var(--text-secondary)',
                lineHeight: 1,
              }}
            >
              {isIncoming ? '+' : ''}
              {sub.points}
            </p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>pts</p>
          </div>
        </div>

        {/* Bottom row: tags + time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {/* Category tag */}
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'capitalize',
              color: catMeta.color,
              background: catMeta.bg,
              border: `1px solid ${catMeta.border}`,
              borderRadius: 4,
              padding: '1px 6px',
            }}
          >
            {sub.category}
          </span>

          {/* Cross-dept tag */}
          {sub.cross_dept && (
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--accent-indigo)',
                background: 'rgba(79,70,229,0.1)',
                border: '1px solid rgba(79,70,229,0.25)',
                borderRadius: 4,
                padding: '1px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {homeDept?.shortName} → {targetDept?.shortName}
            </span>
          )}

          {/* Status */}
          <span
            className={`status-pill ${sub.status}`}
            style={{ fontSize: '0.6rem', padding: '1px 6px' }}
          >
            {sub.status}
          </span>

          {/* Spacer + time */}
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {relativeTime(sub.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PointsTimelineProps {
  user: User;
  limit?: number;
}

export default function PointsTimeline({ user, limit }: PointsTimelineProps) {
  const [events, setEvents] = useState<PointSubmission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [subs, allUsers, allDepts] = await Promise.all([
          submissionService.getSubmissionsForUser(user.id),
          userService.getAllUsers(),
          departmentService.getAllDepartments(),
        ]);
        if (isMounted) {
          const sorted = [...subs].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setEvents(limit ? sorted.slice(0, limit) : sorted);
          setUsers(allUsers);
          setDepartments(allDepts);
        }
      } catch (err) {
        console.error('[PointsTimeline] Failed to load data', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user.id, limit]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const incoming = events.filter((s) => s.targetUserId === user.id);
  const outgoing = events.filter((s) => s.submitterId === user.id);
  const totalReceived = incoming
    .filter((s) => s.status === 'approved')
    .reduce((a, s) => a + s.points, 0);
  const totalGiven = outgoing
    .filter((s) => s.status === 'approved')
    .reduce((a, s) => a + s.points, 0);

  if (events.length === 0) {
    return (
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📜</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No recognition submissions yet
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{ padding: '20px 20px 24px' }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '0.92rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 2,
            }}
          >
            Points Timeline
          </h3>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            All recognition activity for your account
          </p>
        </div>
        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--accent-green)',
                letterSpacing: '-0.03em',
              }}
            >
              +{totalReceived}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>received</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--accent-indigo)',
                letterSpacing: '-0.03em',
              }}
            >
              {totalGiven}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>given</p>
          </div>
        </div>
      </div>

      {/* Filter legend */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.68rem',
            color: 'var(--accent-green)',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-green)',
            }}
          />
          Received
        </span>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.68rem',
            color: 'var(--accent-indigo)',
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-indigo)',
            }}
          />
          Submitted
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
          }}
        >
          {events.length} events
        </span>
      </div>

      {/* Events list */}
      <div>
        {events.map((sub, i) => (
          <TimelineEvent
            key={sub.id}
            sub={sub}
            isLast={i === events.length - 1}
            userId={user.id}
            userMap={userMap}
            deptMap={deptMap}
          />
        ))}
      </div>
    </div>
  );
}
