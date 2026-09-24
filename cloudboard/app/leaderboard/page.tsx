'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { User, Department, UserRole } from '@/lib/services/types';
import { userService, departmentService } from '@/lib/services';
import { ROLE_ORDER, getBadgeColors, getRoleMeta } from '@/lib/utils';
import { logger } from '@/lib/logger';
import EmptyState from '@/components/ui/EmptyState';
import { Trophy, Medal, Crown } from 'lucide-react';

function Podium({ top3, deptMap }: { top3: User[]; deptMap: Map<string, Department> }) {
  if (top3.length < 3) return null;

  const displayOrder = [top3[1], top3[0], top3[2]];
  const heights = [140, 190, 120];
  const medals = [
    { label: '2nd', color: '#94a3b8', bg: 'linear-gradient(135deg, #64748b, #94a3b8)', border: '#cbd5e1', ring: 'rgba(148, 163, 184, 0.4)' },
    { label: '1st', color: '#f59e0b', bg: 'linear-gradient(135deg, #d97706, #fbbf24)', border: '#fcd34d', ring: 'rgba(245, 158, 11, 0.4)' },
    { label: '3rd', color: '#b45309', bg: 'linear-gradient(135deg, #92400e, #d97706)', border: '#f59e0b', ring: 'rgba(180, 83, 9, 0.4)' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 36,
        marginTop: 20,
      }}
    >
      {displayOrder.map((user, idx) => {
        const medal = medals[idx];
        const h = heights[idx];
        const dept = deptMap.get(user.deptId);

        return (
          <div
            key={user.id}
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 160,
              animationDelay: `${idx * 120}ms`,
            }}
          >
            {idx === 1 && (
              <div style={{ marginBottom: 6, color: '#f59e0b', filter: 'drop-shadow(0 2px 8px rgba(245, 158, 11, 0.4))' }}>
                <Crown size={28} />
              </div>
            )}

            {/* Avatar circle */}
            <div
              style={{
                width: idx === 1 ? 72 : 60,
                height: idx === 1 ? 72 : 60,
                borderRadius: '50%',
                marginBottom: 14,
                background: `${user.avatarColor}20`,
                border: `3px solid ${medal.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: idx === 1 ? '1.4rem' : '1.15rem',
                fontWeight: 800,
                color: user.avatarColor,
                boxShadow: `0 8px 24px ${medal.ring}`,
                position: 'relative',
              }}
            >
              {user.avatarInitials}
              <div
                style={{
                  position: 'absolute',
                  bottom: -8,
                  background: medal.bg,
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 10px',
                  borderRadius: 10,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                }}
              >
                {medal.label}
              </div>
            </div>

            {/* User Meta */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <p
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 140,
                }}
              >
                {user.name.split(' ')[0]}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {dept?.shortName}
              </p>
              <p
                style={{
                  fontSize: idx === 1 ? '1.25rem' : '1.1rem',
                  fontWeight: 800,
                  color: 'var(--accent-amber)',
                  marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {user.totalPoints.toLocaleString()} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>pts</span>
              </p>
            </div>

            {/* Podium block */}
            <div
              className="glass-card"
              style={{
                width: '100%',
                height: h,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: 'none',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: medal.bg }} />
              <span
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: medal.color,
                  opacity: 0.25,
                }}
              >
                {idx === 1 ? '1' : idx === 0 ? '2' : '3'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [allUsers, depts] = await Promise.all([
          userService.getAllUsers(),
          departmentService.getAllDepartments(),
        ]);
        if (isMounted) {
          setMembers(allUsers);
          setDepartments(depts);
        }
      } catch (err: unknown) {
        logger.error('[LeaderboardPage] Failed to load data:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const rankedMembers = useMemo(() => {
    let list = [...members];
    if (roleFilter !== 'all') {
      list = list.filter((m) => m.role === roleFilter);
    }
    return list.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [members, roleFilter]);

  const top3 = rankedMembers.slice(0, 3);
  const rest = rankedMembers.slice(3);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* Header card with segmented filters */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}
          >
            Global Contributor Leaderboard
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Recognising top team contributors across the entire organisation
          </p>
        </div>

        {/* Role Filters Segmented Control */}
        <div className="filter-segmented">
          {(['all', ...ROLE_ORDER] as const).map((r) => {
            const isActive = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r as UserRole | 'all')}
                className={`filter-segment-btn ${isActive ? 'active' : ''}`}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                {r === 'all' ? 'All Roles' : getRoleMeta(r).label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Podium */}
      <Podium top3={top3} deptMap={deptMap} />

      {/* Ranked List */}
      <div
        className="glass-card animate-fade-in-up"
        style={{ padding: 0, overflow: 'hidden' }}
      >
        {rest.map((user, idx) => {
          const rank = idx + 4;
          const dept = deptMap.get(user.deptId);
          const meta = getRoleMeta(user.role);
          const bc = getBadgeColors(user.role);

          return (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: idx % 2 === 0 ? 'var(--bg-subtle)' : 'transparent',
                transition: 'background 0.15s ease',
              }}
            >
              {/* Rank Number Badge */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: 'var(--text-secondary)',
                }}
              >
                #{rank}
              </div>

              {/* Avatar */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: `${user.avatarColor}20`,
                  border: `2px solid ${user.avatarColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: user.avatarColor,
                }}
              >
                {user.avatarInitials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {user.name}
                  </p>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: bc.bg,
                      color: bc.text,
                      border: `1px solid ${bc.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {dept?.icon} {dept?.name}
                </p>
              </div>

              {/* Points */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--accent-amber)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {user.totalPoints.toLocaleString()}
                </p>
                <p
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 600,
                  }}
                >
                  points
                </p>
              </div>
            </div>
          );
        })}

        {rest.length === 0 && top3.length === 0 && (
          <EmptyState
            icon="🏆"
            title="No members found"
            description="No members match the selected role filter."
          />
        )}
      </div>
    </div>
  );
}
