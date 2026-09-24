'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { User, PointSubmission, Department } from '@/lib/services/types';
import { userService, submissionService, departmentService } from '@/lib/services';
import { ROLE_RANK, BADGE_COLORS, ROLE_META, getBadgeColors, getRoleMeta, getRoleRank } from '@/lib/utils';

function getApprovedPoints(userId: string, submissions: PointSubmission[]): number {
  return submissions
    .filter((s) => s.targetUserId === userId && s.status === 'approved')
    .reduce((a, s) => a + s.points, 0);
}

function getCrossDeptPoints(userId: string, submissions: PointSubmission[]): number {
  return submissions
    .filter((s) => s.targetUserId === userId && s.status === 'approved' && s.cross_dept)
    .reduce((a, s) => a + s.points, 0);
}

function getSubmissionsGiven(userId: string, submissions: PointSubmission[]): number {
  return submissions.filter((s) => s.submitterId === userId).length;
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: '1.1rem' }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: '1.1rem' }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: '1.1rem' }}>🥉</span>;
  return (
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        background: 'var(--bg-muted)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'var(--text-muted)',
      }}
    >
      {rank}
    </span>
  );
}

function LeaderRow({
  user,
  rank,
  approvedPts,
  crossPts,
  givenCount,
  isCurrentUser,
  deptMap,
}: {
  user: User;
  rank: number;
  approvedPts: number;
  crossPts: number;
  givenCount: number;
  isCurrentUser: boolean;
  deptMap: Map<string, Department>;
}) {
  const dept = deptMap.get(user.deptId);
  const meta = getRoleMeta(user.role);
  const bc = getBadgeColors(user.role);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 10,
        background: isCurrentUser ? 'rgba(22,163,74,0.08)' : 'transparent',
        border: isCurrentUser ? '1px solid rgba(22,163,74,0.3)' : '1px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {/* Rank */}
      <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <RankMedal rank={rank} />
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `${user.avatarColor}20`,
          border: `2px solid ${isCurrentUser ? user.avatarColor : user.avatarColor + '50'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: user.avatarColor,
          flexShrink: 0,
          boxShadow: isCurrentUser ? `0 0 12px ${user.avatarColor}30` : 'none',
        }}
      >
        {user.avatarInitials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: isCurrentUser ? 700 : 600,
              color: isCurrentUser ? 'var(--text-primary)' : 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.name.split(' ').slice(0, 2).join(' ')}
          </span>
          {isCurrentUser && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--accent-green)',
                background: 'rgba(22,163,74,0.12)',
                border: '1px solid rgba(22,163,74,0.3)',
                borderRadius: 4,
                padding: '1px 5px',
              }}
            >
              You
            </span>
          )}
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: bc.text,
              background: bc.bg,
              border: `1px solid ${bc.border}`,
              borderRadius: 4,
              padding: '1px 5px',
            }}
          >
            {meta.label}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>{dept?.icon}</span>
          <span>{dept?.shortName}</span>
          {crossPts > 0 && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span style={{ color: 'var(--accent-indigo)' }}>
                {crossPts} cross-dept
              </span>
            </>
          )}
        </div>
      </div>

      {/* Points */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p
          style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: rank === 1 ? 'var(--accent-amber)' : 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {approvedPts.toLocaleString()}
        </p>
        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
          {givenCount} given
        </p>
      </div>
    </div>
  );
}

interface CoreTeamLeaderboardProps {
  currentUser: User;
}

export default function CoreTeamLeaderboard({ currentUser }: CoreTeamLeaderboardProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [users, subs, depts] = await Promise.all([
          userService.getAllUsers(),
          submissionService.getSubmissions(),
          departmentService.getAllDepartments(),
        ]);
        if (isMounted) {
          setAllUsers(users);
          setSubmissions(subs);
          setDepartments(depts);
        }
      } catch (err) {
        console.error('[CoreTeamLeaderboard] Failed to load data', err);
      }
    }
    loadData();

    const handleReload = () => loadData();
    window.addEventListener('contribution-submitted', handleReload);
    return () => {
      isMounted = false;
      window.removeEventListener('contribution-submitted', handleReload);
    };
  }, []);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const eligibleUsers = useMemo(() => {
    return allUsers.filter((u) => ROLE_RANK[u.role] >= ROLE_RANK['committee']);
  }, [allUsers]);

  const leaderboardData = useMemo(() => {
    return eligibleUsers
      .map((u) => {
        const subPts = getApprovedPoints(u.id, submissions);
        const pts = subPts > 0 ? subPts : (u.totalPoints || 0);
        return {
          user: u,
          approvedPts: pts,
          crossPts: getCrossDeptPoints(u.id, submissions),
          givenCount: getSubmissionsGiven(u.id, submissions),
        };
      })
      .sort((a, b) => b.approvedPts - a.approvedPts);
  }, [eligibleUsers, submissions]);

  // Hook unconditional calling: gate return after all hooks are evaluated
  if (ROLE_RANK[currentUser.role] < ROLE_RANK['committee']) {
    return null;
  }

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{ padding: '20px 0 4px' }}
    >
      {/* Header */}
      <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3
          style={{
            fontSize: '0.92rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 2,
          }}
        >
          Committee Leaderboard
        </h3>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Rankings for committee members and leadership
        </p>
      </div>

      {/* Rows */}
      <div style={{ padding: '12px 10px' }}>
        {leaderboardData.slice(0, 5).map((d, idx) => (
          <LeaderRow
            key={d.user.id}
            user={d.user}
            rank={idx + 1}
            approvedPts={d.approvedPts}
            crossPts={d.crossPts}
            givenCount={d.givenCount}
            isCurrentUser={d.user.id === currentUser.id}
            deptMap={deptMap}
          />
        ))}
      </div>
    </div>
  );
}
