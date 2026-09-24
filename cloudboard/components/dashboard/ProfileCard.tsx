'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { User, Department, PointSubmission } from '@/lib/services/types';
import { userService, submissionService, departmentService } from '@/lib/services';
import { ROLE_RANK, BADGE_COLORS, ROLE_META, getBadgeColors, getRoleMeta, getRoleRank } from '@/lib/utils';
import { useRole } from '@/lib/roleContext';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local.charAt(0)}*@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

interface ProfileCardProps {
  user: User;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  const { currentUser, isLeader, isDeptHead, isCommittee } = useRole();
  const [activeUser, setActiveUser] = useState<User>(user);
  const [dept, setDept] = useState<Department | null>(null);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [freshUser, freshDept, freshSubs] = await Promise.all([
          userService.getUserById(user.id),
          departmentService.getDepartmentById(user.deptId),
          submissionService.getSubmissionsForUser(user.id),
        ]);
        if (isMounted) {
          if (freshUser) setActiveUser(freshUser);
          if (freshDept) setDept(freshDept);
          if (freshSubs) setSubmissions(freshSubs);
        }
      } catch (err) {
        console.error('[ProfileCard] Failed to load data', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user.id, user.deptId]);

  const meta = getRoleMeta(activeUser?.role);
  const bc = getBadgeColors(activeUser?.role);

  // Calculate confirmed (approved) points from submissions targeting this user
  const confirmedPoints = useMemo(
    () =>
      submissions
        .filter((s) => s.targetUserId === activeUser.id && s.status === 'approved')
        .reduce((acc, s) => acc + s.points, 0),
    [submissions, activeUser.id]
  );

  const pendingPoints = useMemo(
    () =>
      submissions
        .filter((s) => s.targetUserId === activeUser.id && s.status === 'pending')
        .reduce((acc, s) => acc + s.points, 0),
    [submissions, activeUser.id]
  );

  const rankLabel =
    ROLE_RANK[activeUser.role] >= 2
      ? 'Leadership'
      : ROLE_RANK[activeUser.role] === 1
      ? 'Committee'
      : 'Volunteer';

  const canViewFullEmail =
    currentUser?.id === activeUser?.id || isLeader || isDeptHead || isCommittee;

  const joinYear = new Date(activeUser.joinDate).getFullYear();
  const joinMonth = new Date(activeUser.joinDate).toLocaleString('en-IN', {
    month: 'short',
  });

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top gradient banner */}
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, ${dept?.color ?? '#16a34a'}25, transparent)`,
          borderBottom: `1px solid var(--border-subtle)`,
          position: 'relative',
        }}
      >
        {/* Role badge – top right */}
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: bc.bg,
            color: bc.text,
            border: `1px solid ${bc.border}`,
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            zIndex: 1,
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* Avatar – overlapping the banner */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ marginTop: -32, marginBottom: 12 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: `${activeUser.avatarColor}22`,
              border: `3px solid ${activeUser.avatarColor}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              fontWeight: 800,
              color: activeUser.avatarColor,
              boxShadow: `0 0 0 4px var(--bg-secondary), 0 4px 16px ${activeUser.avatarColor}30`,
              letterSpacing: '-0.03em',
            }}
          >
            {activeUser.avatarInitials}
          </div>
        </div>

        {/* Name & meta */}
        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: 3,
          }}
        >
          {activeUser.name}
        </h2>
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {canViewFullEmail ? activeUser.email : maskEmail(activeUser.email)}
          {!canViewFullEmail && activeUser.email && (
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-muted)',
                padding: '1px 5px',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
              }}
              title="Protected PII"
            >
              🔒 Private
            </span>
          )}
        </p>

        {/* Dept chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {dept && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: `${dept.color}15`,
                border: `1px solid ${dept.color}35`,
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: dept.color,
              }}
            >
              <span>{dept.icon}</span>
              {dept.name}
            </span>
          )}
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {rankLabel}
          </span>
        </div>

        {/* Points section */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 14,
          }}
        >
          <p
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            Points Summary
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--accent-amber)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {confirmedPoints}
              </p>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}
              >
                Confirmed
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--accent-amber)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  opacity: 0.65,
                }}
              >
                {pendingPoints}
              </p>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}
              >
                Pending
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {activeUser.totalPoints.toLocaleString()}
              </p>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}
              >
                Lifetime
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Member since {joinMonth} {joinYear}
          </span>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent-green)',
              boxShadow: '0 0 8px rgba(22,163,74,0.5)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
