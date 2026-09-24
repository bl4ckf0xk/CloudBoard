'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Department, User, DeptId, PointSubmission } from '@/lib/services/types';
import { departmentService, userService, submissionService } from '@/lib/services';
import { getBadgeColors, getRoleMeta } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Users, Sparkles, ChevronDown, ChevronUp, UserCheck, PlusCircle, Award, ArrowUpRight } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [expandedDept, setExpandedDept] = useState<DeptId | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [depts, allUsers, allSubs] = await Promise.all([
        departmentService.getAllDepartments(),
        userService.getAllUsers(),
        submissionService.getSubmissions(),
      ]);
      setDepartments(depts);
      setMembers(allUsers);
      setSubmissions(allSubs);
    } catch (err: unknown) {
      logger.error('[DepartmentsPage] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Check URL search param or hash for auto-expanded department
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetDept = params.get('dept') || window.location.hash.replace('#', '');
      if (targetDept) {
        setExpandedDept(targetDept as DeptId);
        setTimeout(() => {
          const el = document.getElementById(targetDept);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [loadData]);

  // Listen for real-time contribution updates
  useEffect(() => {
    const handleReload = () => loadData();
    window.addEventListener('contribution-submitted', handleReload);
    return () => window.removeEventListener('contribution-submitted', handleReload);
  }, [loadData]);

  const deptStats = useMemo(() => {
    const stats: Record<
      string,
      {
        members: User[];
        points: number;
        head: User | undefined;
        approvedCount: number;
        crossCount: number;
      }
    > = {};

    for (const dept of departments) {
      const deptMembers = members.filter((m) => m.deptId === dept.id);
      const totalPoints = deptMembers.reduce((sum, m) => sum + m.totalPoints, 0);
      const head = deptMembers.find((m) => m.role === 'dept-head' || m.role === 'leader');

      const deptSubs = submissions.filter(
        (s) => (s.home_dept === dept.id || s.target_dept === dept.id) && s.status === 'approved'
      );
      const crossSubs = deptSubs.filter((s) => s.cross_dept);

      stats[dept.id] = {
        members: deptMembers.sort((a, b) => b.totalPoints - a.totalPoints),
        points: totalPoints,
        head,
        approvedCount: deptSubs.length,
        crossCount: crossSubs.length,
      };
    }
    return stats;
  }, [departments, members, submissions]);

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* Header Card */}
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
            Organisation Departments
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Cross-department overview, committee structures, and team rosters
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'var(--accent-indigo-subtle)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--accent-indigo)',
            }}
          >
            {departments.length} Active Departments
          </span>
        </div>
      </div>

      {/* Dept cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
        {departments.map((dept, idx) => {
          const stat = deptStats[dept.id];
          if (!stat) return null;

          const isExpanded = expandedDept === dept.id;

          return (
            <div
              key={dept.id}
              id={dept.id}
              className={`glass-card animate-fade-in-up stagger-${(idx % 5) + 1}`}
              style={{
                padding: 0,
                transition: 'all 0.25s ease',
                border: isExpanded ? `2px solid ${dept.color}` : '1px solid var(--border-card)',
                overflow: 'hidden',
              }}
            >
              {/* Dept color top accent strip */}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${dept.color}, ${dept.color}40)` }} />

              {/* Card body */}
              <div style={{ padding: '22px 24px' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: `${dept.color}15`,
                      border: `1.5px solid ${dept.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      flexShrink: 0,
                    }}
                  >
                    {dept.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {dept.name}
                    </h3>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: dept.color,
                        background: `${dept.color}15`,
                        border: `1px solid ${dept.color}30`,
                        borderRadius: 5,
                        padding: '2px 8px',
                      }}
                    >
                      {dept.shortName}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {/* Members */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '12px 16px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--text-muted)',
                        marginBottom: 4,
                      }}
                    >
                      Members
                    </p>
                    <p
                      style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.04em',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stat.members.length}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>active roster</p>
                  </div>

                  {/* Points */}
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: 12,
                      padding: '12px 16px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'var(--accent-amber)',
                        marginBottom: 4,
                      }}
                    >
                      Total Points
                    </p>
                    <p
                      style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: 'var(--accent-amber)',
                        letterSpacing: '-0.04em',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {stat.points.toLocaleString()}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--accent-amber)', marginTop: 4 }}>points earned</p>
                  </div>
                </div>

                {/* Dept Head row */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: stat.head ? `${stat.head.avatarColor}20` : 'var(--bg-card)',
                      border: `1.5px solid ${stat.head ? stat.head.avatarColor : 'var(--border-subtle)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: stat.head?.avatarColor ?? 'var(--text-muted)',
                    }}
                  >
                    {stat.head ? stat.head.avatarInitials : '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: 1,
                      }}
                    >
                      Department Head
                    </p>
                    <p
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {stat.head ? stat.head.name : 'Unassigned'}
                    </p>
                  </div>
                  {stat.head && (
                    <span
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: 'var(--accent-green)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 4,
                        padding: '2px 8px',
                      }}
                    >
                      Head
                    </span>
                  )}
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedDept(isExpanded ? null : (dept.id as DeptId))}
                  className="cb-btn-ghost"
                  style={{
                    width: '100%',
                    fontSize: '0.82rem',
                    color: isExpanded ? dept.color : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span>{isExpanded ? 'Hide Roster' : `View Team Roster (${stat.members.length})`}</span>
                </button>
              </div>

              {/* Expandable Member List */}
              {isExpanded && (
                <div
                  className="animate-slide-down"
                  style={{
                    borderTop: `1px solid var(--border-subtle)`,
                    background: 'var(--bg-subtle)',
                  }}
                >
                  <div style={{ padding: '16px 24px 22px' }}>
                    {/* Department Overview Action & Stats Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                        marginBottom: 16,
                        paddingBottom: 14,
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: 6,
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: 'var(--accent-amber)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                          }}
                        >
                          {stat.points.toLocaleString()} Points
                        </span>
                        {stat.crossCount > 0 && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 6,
                              background: 'rgba(16, 185, 129, 0.12)',
                              color: 'var(--accent-green)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            {stat.crossCount} Cross-Team
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-log-modal'))}
                        className="cb-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.76rem', gap: 6 }}
                      >
                        <PlusCircle size={14} />
                        <span>Award Points</span>
                      </button>
                    </div>

                    <h4
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: 12,
                      }}
                    >
                      Team Roster ({stat.members.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {stat.members.map((member, mIdx) => {
                        const bc = getBadgeColors(member?.role);
                        const meta = getRoleMeta(member?.role);
                        const isTop = mIdx === 0;

                        return (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '10px 14px',
                              background: isTop ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card)',
                              borderRadius: 10,
                              border: `1px solid ${isTop ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}`,
                            }}
                          >
                            <span
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 7,
                                flexShrink: 0,
                                background: isTop ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-muted)',
                                border: `1px solid ${isTop ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                color: isTop ? 'var(--accent-amber)' : 'var(--text-muted)',
                              }}
                            >
                              {mIdx + 1}
                            </span>

                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                flexShrink: 0,
                                background: `${member.avatarColor}20`,
                                border: `1.5px solid ${member.avatarColor}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                color: member.avatarColor,
                                overflow: 'hidden',
                              }}
                            >
                              {member.avatarUrl ? (
                                <img
                                  src={member.avatarUrl}
                                  alt={member.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                member.avatarInitials
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {member.name}
                              </p>
                            </div>

                            {member.role !== 'volunteer' && (
                              <span
                                style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  background: bc.bg,
                                  color: bc.text,
                                  border: `1px solid ${bc.border}`,
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  flexShrink: 0,
                                }}
                              >
                                {meta.label}
                              </span>
                            )}

                            <span
                              style={{
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                color: 'var(--accent-amber)',
                                flexShrink: 0,
                                minWidth: 42,
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {member.totalPoints.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
