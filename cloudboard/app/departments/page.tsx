'use client';

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Department, User, DeptId, PointSubmission } from '@/lib/services/types';
import { departmentService, userService, submissionService } from '@/lib/services';
import { INITIAL_DEPARTMENTS, INITIAL_USERS } from '@/lib/services/adapters/local/seedData';
import { getBadgeColors, getRoleMeta, enrichUsersWithPoints } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  Users,
  Sparkles,
  PlusCircle,
  Award,
  ArrowUpRight,
  CheckCircle2,
  Search,
  ArrowLeft,
  Layers,
} from 'lucide-react';

const DEPT_INFO: Record<
  string,
  {
    description: string;
    focusAreas: string[];
  }
> = {
  'marketing-design': {
    description:
      'Brand identity, digital campaigns, creative visual design, social media amplification, and community engagement.',
    focusAreas: ['Brand Assets', 'Social Content', 'Graphic Design', 'UI/UX Prototypes'],
  },
  'budget-io': {
    description:
      'Financial governance, sponsorship acquisition, procurement, fiscal tracking, and internal operations auditing.',
    focusAreas: ['Sponsorship Outreach', 'Budget Allocation', 'Fiscal Audits', 'Vendor Procurement'],
  },
  'delegate-handling': {
    description:
      'Attendee onboarding, VIP hosting, registration desk logistics, delegate hospitality, and communication management.',
    focusAreas: ['Hospitality & VIPs', 'Check-In Desks', 'Attendee Queries', 'Welcome Kits'],
  },
  engineering: {
    description:
      'Software platform engineering, CloudBoard infrastructure, automation pipelines, AWS cloud services, and technical support.',
    focusAreas: ['Frontend & Cloud', 'API Gateway & Auth', 'DevOps Pipelines', 'System Stability'],
  },
  'event-coordination': {
    description:
      'Stage operations, master scheduling, venue management, audio/visual coordination, and real-time event logistics.',
    focusAreas: ['Venue Scheduling', 'Stage Operations', 'AV Coordination', 'Speaker Management'],
  },
};

function normalizeDeptId(raw?: string | null): DeptId | 'all' {
  if (!raw || raw === 'all') return 'all';
  const r = raw.toLowerCase().trim().replace(/^dept-/, '');
  if (r === 'events' || r === 'event' || r === 'event-coordination' || r === 'event_coordination') return 'event-coordination';
  if (r === 'marketing' || r === 'design' || r === 'marketing-design' || r === 'marketing_design' || r === 'mktg') return 'marketing-design';
  if (r === 'budget' || r === 'io' || r === 'budget-io' || r === 'budget_io') return 'budget-io';
  if (r === 'delegates' || r === 'delegate' || r === 'delegate-handling' || r === 'delegate_handling') return 'delegate-handling';
  if (r === 'engineering' || r === 'eng' || r === 'tech') return 'engineering';
  return (raw as DeptId) || 'all';
}

function DepartmentsContent() {
  const searchParams = useSearchParams();

  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [members, setMembers] = useState<User[]>(INITIAL_USERS);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<DeptId | 'all'>('all');
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'approved' | 'pending' | 'cross'>('all');

  const loadData = useCallback(async () => {
    try {
      const [depts, allUsers, allSubs] = await Promise.all([
        departmentService.getAllDepartments(),
        userService.getAllUsers(),
        submissionService.getSubmissions(),
      ]);
      if (Array.isArray(depts) && depts.length > 0) setDepartments(depts);
      if (Array.isArray(allUsers) && allUsers.length > 0) setMembers(allUsers);
      if (Array.isArray(allSubs)) setSubmissions(allSubs);
    } catch (err: unknown) {
      logger.error('[DepartmentsPage] Failed to load fresh data:', err);
    }
  }, []);

  // Initial and reactive query parameter syncing
  useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const rawDept = params.get('dept') || window.location.hash.replace('#', '');
        const normalized = normalizeDeptId(rawDept);
        setSelectedDeptId(normalized);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for real-time contribution updates & custom dept select events
  useEffect(() => {
    const handleReload = () => loadData();
    const handleDeptSelected = (e: Event) => {
      const custom = e as CustomEvent<{ deptId: string }>;
      if (custom.detail) {
        const normalized = normalizeDeptId(custom.detail.deptId);
        setSelectedDeptId(normalized);
      }
    };

    window.addEventListener('contribution-submitted', handleReload);
    window.addEventListener('cloudboard-dept-selected', handleDeptSelected);
    return () => {
      window.removeEventListener('contribution-submitted', handleReload);
      window.removeEventListener('cloudboard-dept-selected', handleDeptSelected);
    };
  }, [loadData]);

  const selectDepartment = (id: DeptId | 'all') => {
    const normalized = normalizeDeptId(id);
    setSelectedDeptId(normalized);

    if (typeof window !== 'undefined') {
      const newUrl = normalized === 'all' ? '/departments' : `/departments?dept=${normalized}`;
      window.history.pushState(null, '', newUrl);
      window.dispatchEvent(
        new CustomEvent('cloudboard-dept-selected', { detail: { deptId: normalized === 'all' ? null : normalized } })
      );
    }
  };

  // Compute stats for all departments
  const deptStats = useMemo(() => {
    const stats: Record<
      string,
      {
        dept: Department;
        members: User[];
        points: number;
        head: User | undefined;
        approvedCount: number;
        pendingCount: number;
        crossCount: number;
        rank: number;
        avgPoints: number;
      }
    > = {};

    const deptsToProcess = departments.length > 0 ? departments : INITIAL_DEPARTMENTS;
    const baseUsers = members.length > 0 ? members : INITIAL_USERS;
    const usersToProcess = enrichUsersWithPoints(baseUsers, submissions);

    const rawList = deptsToProcess.map((dept) => {
      const deptMembers = usersToProcess.filter((m) => m.deptId === dept.id);
      const totalPoints = deptMembers.reduce((sum, m) => sum + (m.totalPoints || 0), 0);
      const head = deptMembers.find((m) => m.role === 'dept-head') || deptMembers.find((m) => m.role === 'leader');

      const approvedSubs = submissions.filter(
        (s) => (s.home_dept === dept.id || s.target_dept === dept.id) && s.status === 'approved'
      );
      const pendingSubs = submissions.filter(
        (s) => (s.home_dept === dept.id || s.target_dept === dept.id) && s.status === 'pending'
      );
      const crossSubs = submissions.filter(
        (s) => (s.home_dept === dept.id || s.target_dept === dept.id) && s.cross_dept
      );

      return {
        dept,
        members: deptMembers.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)),
        points: totalPoints,
        head,
        approvedCount: approvedSubs.length,
        pendingCount: pendingSubs.length,
        crossCount: crossSubs.length,
        avgPoints: deptMembers.length > 0 ? Math.round(totalPoints / deptMembers.length) : 0,
      };
    });

    const sorted = [...rawList].sort((a, b) => b.points - a.points);
    sorted.forEach((item, index) => {
      stats[item.dept.id] = {
        ...item,
        rank: index + 1,
      };
    });

    return stats;
  }, [departments, members, submissions]);

  const activeDept = useMemo(() => {
    if (selectedDeptId === 'all') return null;
    const list = departments.length > 0 ? departments : INITIAL_DEPARTMENTS;
    return list.find((d) => d.id === selectedDeptId) || null;
  }, [departments, selectedDeptId]);

  const activeDeptStat = useMemo(() => {
    if (!activeDept) return null;
    return (
      deptStats[activeDept.id] || {
        dept: activeDept,
        members: members.filter((m) => m.deptId === activeDept.id),
        points: 0,
        head: members.find((m) => m.deptId === activeDept.id && (m.role === 'dept-head' || m.role === 'leader')),
        approvedCount: 0,
        pendingCount: 0,
        crossCount: 0,
        rank: 1,
        avgPoints: 0,
      }
    );
  }, [activeDept, deptStats, members]);

  // Filtered members for the active department overview
  const filteredActiveMembers = useMemo(() => {
    if (!activeDeptStat) return [];
    if (!searchMemberQuery.trim()) return activeDeptStat.members;
    const q = searchMemberQuery.toLowerCase().trim();
    return activeDeptStat.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.role && m.role.toLowerCase().includes(q))
    );
  }, [activeDeptStat, searchMemberQuery]);

  // Submissions for the active department
  const activeDeptSubmissions = useMemo(() => {
    if (!activeDept) return [];
    let list = submissions.filter(
      (s) => s.home_dept === activeDept.id || s.target_dept === activeDept.id
    );

    if (submissionFilter === 'approved') {
      list = list.filter((s) => s.status === 'approved');
    } else if (submissionFilter === 'pending') {
      list = list.filter((s) => s.status === 'pending');
    } else if (submissionFilter === 'cross') {
      list = list.filter((s) => s.cross_dept);
    }

    return list.sort(
      (a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }, [activeDept, submissions, submissionFilter]);

  // Member map for quick lookup of names
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [members]);

  const displayDepts = departments.length > 0 ? departments : INITIAL_DEPARTMENTS;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* ─── Top Tabs Switcher Bar ─────────────────────────────── */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            maxWidth: '100%',
            paddingBottom: 2,
          }}
        >
          {/* All Departments button */}
          <button
            onClick={() => selectDepartment('all')}
            className={`cb-btn-ghost ${selectedDeptId === 'all' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.82rem',
              fontWeight: 700,
              background: selectedDeptId === 'all' ? 'var(--accent-indigo)' : 'var(--bg-card)',
              color: selectedDeptId === 'all' ? '#ffffff' : 'var(--text-secondary)',
              border: selectedDeptId === 'all' ? '1px solid var(--accent-indigo)' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            <Layers size={15} />
            <span>All Departments</span>
            <span
              style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: 10,
                background: selectedDeptId === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--bg-muted)',
              }}
            >
              {displayDepts.length}
            </span>
          </button>

          {/* Individual Department Tabs */}
          {displayDepts.map((dept) => {
            const isSelected = selectedDeptId === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => selectDepartment(dept.id as DeptId)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? `${dept.color}20` : 'var(--bg-card)',
                  color: isSelected ? dept.color : 'var(--text-secondary)',
                  border: isSelected ? `1.5px solid ${dept.color}` : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 2px 10px ${dept.color}25` : 'none',
                }}
              >
                <span>{dept.icon}</span>
                <span>{dept.name}</span>
              </button>
            );
          })}
        </div>

        {selectedDeptId !== 'all' && (
          <button
            onClick={() => selectDepartment('all')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 10px',
            }}
          >
            <ArrowLeft size={14} /> Back to All
          </button>
        )}
      </div>

      {/* ─── SCENARIO 1: SPECIFIC DEPARTMENT OVERVIEW ──────────── */}
      {activeDept && activeDeptStat ? (
        <div className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Hero Banner Card */}
          <div
            className="glass-card"
            style={{
              padding: '28px 32px',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 18,
              border: `1.5px solid ${activeDept.color}40`,
              background: `linear-gradient(135deg, ${activeDept.color}15 0%, var(--bg-card) 65%)`,
              boxShadow: `0 8px 32px ${activeDept.color}12`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                fontSize: '9rem',
                opacity: 0.07,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {activeDept.icon}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: `${activeDept.color}25`,
                    border: `2px solid ${activeDept.color}60`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2.2rem',
                    boxShadow: `0 8px 24px ${activeDept.color}35`,
                    flexShrink: 0,
                  }}
                >
                  {activeDept.icon}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h1
                      style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {activeDept.name}
                    </h1>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: `${activeDept.color}20`,
                        color: activeDept.color,
                        border: `1px solid ${activeDept.color}40`,
                      }}
                    >
                      {activeDept.shortName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 6,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: 'var(--accent-amber)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <TrophyIcon rank={activeDeptStat.rank} /> Rank #{activeDeptStat.rank} of {displayDepts.length}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-secondary)',
                      maxWidth: 680,
                      lineHeight: 1.5,
                      marginTop: 6,
                    }}
                  >
                    {DEPT_INFO[activeDept.id]?.description || 'Active department committee managing operational streams.'}
                  </p>

                  {/* Focus area tags */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {(DEPT_INFO[activeDept.id]?.focusAreas || []).map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: 'var(--bg-muted)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        • {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-log-modal'))}
                  className="cb-btn-primary"
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    gap: 8,
                    background: `linear-gradient(135deg, ${activeDept.color}, #4f46e5)`,
                    boxShadow: `0 4px 16px ${activeDept.color}40`,
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Award Points to Team</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── 4 Metric Cards Grid ─── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {/* Total Points */}
            <div
              className="glass-card"
              style={{
                padding: '20px 22px',
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-amber)', letterSpacing: '0.06em' }}>
                  Total Department Points
                </p>
                <Award size={16} style={{ color: 'var(--accent-amber)' }} />
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {activeDeptStat.points.toLocaleString()}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Avg. {activeDeptStat.avgPoints} pts per member
              </p>
            </div>

            {/* Active Members */}
            <div
              className="glass-card"
              style={{
                padding: '20px 22px',
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-indigo)', letterSpacing: '0.06em' }}>
                  Active Team Roster
                </p>
                <Users size={16} style={{ color: 'var(--accent-indigo)' }} />
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {activeDeptStat.members.length}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />
                100% active standing
              </p>
            </div>

            {/* Approved Tasks */}
            <div
              className="glass-card"
              style={{
                padding: '20px 22px',
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-green)', letterSpacing: '0.06em' }}>
                  Approved Submissions
                </p>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} />
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-green)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {activeDeptStat.approvedCount}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                {activeDeptStat.pendingCount} pending review
              </p>
            </div>

            {/* Cross-Team Collabs */}
            <div
              className="glass-card"
              style={{
                padding: '20px 22px',
                borderRadius: 14,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-violet)', letterSpacing: '0.06em' }}>
                  Cross-Team Collabs
                </p>
                <Sparkles size={16} style={{ color: 'var(--accent-violet)' }} />
              </div>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {activeDeptStat.crossCount}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Inter-department initiatives
              </p>
            </div>
          </div>

          {/* ─── Department Head Spotlight + Podium ─────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 20 }}>
            {/* Dept Head Spotlight Card */}
            <div
              className="glass-card"
              style={{
                padding: '24px',
                borderRadius: 16,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Department Leadership
                  </span>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--accent-green)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    HEAD OF DEPT
                  </span>
                </div>

                {activeDeptStat.head ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: `${activeDeptStat.head.avatarColor}25`,
                        border: `3px solid ${activeDeptStat.head.avatarColor}`,
                        boxShadow: `0 4px 16px ${activeDeptStat.head.avatarColor}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem',
                        fontWeight: 800,
                        color: activeDeptStat.head.avatarColor,
                        marginBottom: 12,
                        overflow: 'hidden',
                      }}
                    >
                      {activeDeptStat.head.avatarUrl ? (
                        <img
                          src={activeDeptStat.head.avatarUrl}
                          alt={activeDeptStat.head.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        activeDeptStat.head.avatarInitials
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {activeDeptStat.head.name}
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                      {activeDeptStat.head.email}
                    </p>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 10,
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--accent-amber)',
                      }}
                    >
                      <Award size={14} />
                      <span>{activeDeptStat.head.totalPoints.toLocaleString()} Points Contributed</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p>Leadership unassigned</p>
                  </div>
                )}
              </div>

              {activeDeptStat.head && (
                <Link
                  href={`/members/${activeDeptStat.head.id}`}
                  className="cb-btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    gap: 6,
                    marginTop: 14,
                  }}
                >
                  <span>View Head Profile</span>
                  <ArrowUpRight size={14} />
                </Link>
              )}
            </div>

            {/* Department Top Performers Podium */}
            <div
              className="glass-card"
              style={{
                padding: '24px',
                borderRadius: 16,
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Top Department Contributors
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
                    Team Leaderboard
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {activeDeptStat.members.slice(0, 3).map((member, idx) => {
                    const badge = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : '🥉 #3';
                    const colors =
                      idx === 0
                        ? { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', text: 'var(--accent-amber)' }
                        : idx === 1
                        ? { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.35)', text: '#94a3b8' }
                        : { bg: 'rgba(205, 127, 50, 0.12)', border: 'rgba(205, 127, 50, 0.35)', text: '#cd7f32' };

                    return (
                      <Link
                        key={member.id}
                        href={`/members/${member.id}`}
                        style={{
                          textDecoration: 'none',
                          background: colors.bg,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 12,
                          padding: '14px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          textAlign: 'center',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: colors.text,
                            marginBottom: 8,
                          }}
                        >
                          {badge}
                        </span>

                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            background: `${member.avatarColor}25`,
                            border: `2px solid ${member.avatarColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                            color: member.avatarColor,
                            marginBottom: 8,
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

                        <p
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                        >
                          {member.name}
                        </p>
                        <p style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: 2 }}>
                          {member.totalPoints.toLocaleString()} pts
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: '10px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.76rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Showing top team contributors</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Total {activeDeptStat.members.length} members
                </span>
              </div>
            </div>
          </div>

          {/* ─── Team Roster Table Section ──────────────────────────── */}
          <div
            className="glass-card"
            style={{
              padding: '24px 28px',
              borderRadius: 16,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 20,
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {activeDept.name} Roster ({filteredActiveMembers.length})
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Member standings, role clearances, and lifetime points earned
                </p>
              </div>

              {/* Search input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  padding: '6px 12px',
                  width: '100%',
                  maxWidth: 280,
                }}
              >
                <Search size={15} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search team member..."
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Roster list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredActiveMembers.map((member, mIdx) => {
                const bc = getBadgeColors(member?.role);
                const meta = getRoleMeta(member?.role);
                const isTop = mIdx === 0 && !searchMemberQuery;

                return (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    style={{
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 16px',
                      background: isTop ? 'rgba(245, 158, 11, 0.06)' : 'var(--bg-card)',
                      borderRadius: 12,
                      border: `1px solid ${isTop ? 'rgba(245, 158, 11, 0.25)' : 'var(--border-subtle)'}`,
                      transition: 'transform 0.15s ease, background 0.15s ease',
                    }}
                    className="cb-table-row"
                  >
                    {/* Rank indicator */}
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: isTop ? 'rgba(245, 158, 11, 0.2)' : 'var(--bg-muted)',
                        border: `1px solid ${isTop ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: isTop ? 'var(--accent-amber)' : 'var(--text-muted)',
                      }}
                    >
                      {mIdx + 1}
                    </span>

                    {/* Avatar */}
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: `${member.avatarColor}20`,
                        border: `2px solid ${member.avatarColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
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

                    {/* Name & Email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {member.name}
                      </p>
                      <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>
                        {member.email}
                      </p>
                    </div>

                    {/* Role badge */}
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        background: bc.bg,
                        color: bc.text,
                        border: `1px solid ${bc.border}`,
                        borderRadius: 6,
                        padding: '3px 8px',
                        flexShrink: 0,
                      }}
                    >
                      {meta.label}
                    </span>

                    {/* Points */}
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <p
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: 'var(--accent-amber)',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {member.totalPoints.toLocaleString()}
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>points</p>
                    </div>

                    <ArrowUpRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ─── Recent Submissions & Activity Log ──────────────────── */}
          <div
            className="glass-card"
            style={{
              padding: '24px 28px',
              borderRadius: 16,
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {activeDept.name} Activity & Submissions
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Verified tasks, logs, and recognized work for this team
                </p>
              </div>

              {/* Submissions Filter Pills */}
              <div style={{ display: 'flex', gap: 6, background: 'var(--bg-subtle)', padding: 4, borderRadius: 8 }}>
                {(['all', 'approved', 'pending', 'cross'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSubmissionFilter(f)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      background: submissionFilter === f ? 'var(--bg-card)' : 'transparent',
                      color: submissionFilter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: submissionFilter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {f === 'cross' ? 'Cross-Dept' : f}
                  </button>
                ))}
              </div>
            </div>

            {activeDeptSubmissions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeDeptSubmissions.map((sub) => {
                  const isApproved = sub.status === 'approved';
                  const targetName = memberNameMap.get(sub.targetUserId) || 'Team Member';
                  return (
                    <div
                      key={sub.id}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--bg-card)',
                        borderRadius: 12,
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isApproved ? 'var(--accent-green)' : 'var(--accent-amber)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            flexShrink: 0,
                          }}
                        >
                          {isApproved ? '✓' : '⏱'}
                        </span>

                        <div>
                          <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {sub.reason || 'Contribution task'}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              For {targetName}
                            </span>
                            {sub.cross_dept && (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  background: 'rgba(139, 92, 246, 0.15)',
                                  color: 'var(--accent-violet)',
                                  borderRadius: 4,
                                  padding: '1px 6px',
                                }}
                              >
                                Cross-Dept
                              </span>
                            )}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: 'var(--accent-amber)',
                          }}
                        >
                          +{sub.points} pts
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: isApproved ? 'var(--status-approved-bg)' : 'var(--status-pending-bg)',
                            color: isApproved ? 'var(--status-approved-text)' : 'var(--status-pending-text)',
                            border: `1px solid ${isApproved ? 'var(--status-approved-border)' : 'var(--status-pending-border)'}`,
                          }}
                        >
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.85rem' }}>No activity records found matching this filter.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── SCENARIO 2: ALL DEPARTMENTS GRID VIEW ─────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Organization Header Banner */}
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
                {displayDepts.length} Active Departments
              </span>
            </div>
          </div>

          {/* Dept cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
            {displayDepts.map((dept, idx) => {
              const stat = deptStats[dept.id];
              if (!stat) return null;

              return (
                <div
                  key={dept.id}
                  id={dept.id}
                  className={`glass-card animate-fade-in-up stagger-${(idx % 5) + 1}`}
                  style={{
                    padding: 0,
                    transition: 'all 0.25s ease',
                    border: '1px solid var(--border-card)',
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
                          overflow: 'hidden',
                        }}
                      >
                        {stat.head?.avatarUrl ? (
                          <img
                            src={stat.head.avatarUrl}
                            alt={stat.head.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          stat.head ? stat.head.avatarInitials : '?'
                        )}
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

                    {/* Button to Open Dedicated Overview */}
                    <button
                      onClick={() => selectDepartment(dept.id as DeptId)}
                      className="cb-btn-primary"
                      style={{
                        width: '100%',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: `linear-gradient(135deg, ${dept.color}, #4f46e5)`,
                      }}
                    >
                      <span>View {dept.name} Overview</span>
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TrophyIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span>🥇</span>;
  if (rank === 2) return <span>🥈</span>;
  if (rank === 3) return <span>🥉</span>;
  return <Award size={13} />;
}

export default function DepartmentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading departments...</div>}>
      <DepartmentsContent />
    </Suspense>
  );
}
