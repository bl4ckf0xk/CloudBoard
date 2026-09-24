'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/roleContext';
import {
  Department,
  User,
  PointSubmission,
} from '@/lib/services/types';
import {
  departmentService,
  userService,
  submissionService,
} from '@/lib/services';
import { relativeTime, CATEGORY_META, ROLE_RANK } from '@/lib/utils';
import { logger } from '@/lib/logger';
import EmptyState from '@/components/ui/EmptyState';
import {
  TrendingUp,
  Users,
  Clock,
  Sparkles,
  Check,
  X,
  ChevronRight,
  Award,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

// ─── Stat Card Component ──────────────────────────────────
function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  trendPositive = true,
  delay = 0,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  delay?: number;
}) {
  return (
    <div
      className="glass-card stat-card animate-fade-in-up"
      style={{
        padding: '22px 24px',
        animationDelay: `${delay}ms`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 140,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent-indigo)' }}>{icon}</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            {label}
          </span>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
        {(trend || subtext) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              fontSize: '0.78rem',
            }}
          >
            {trend && (
              <span
                style={{
                  fontWeight: 700,
                  color: trendPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {trend}
              </span>
            )}
            {subtext && <span style={{ color: 'var(--text-muted)' }}>{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contribution Trends Chart (SVG) ──────────────────────
function ContributionTrendsChart() {
  const [timeRange, setTimeRange] = useState('8w');

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Contribution Trends
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Points awarded per week, internal vs cross-department
          </p>
        </div>

        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="custom-select"
          style={{ width: 'auto', padding: '6px 30px 6px 12px', fontSize: '0.8rem' }}
        >
          <option value="4w">Last 4 weeks</option>
          <option value="8w">Last 8 weeks</option>
          <option value="quarter">This Quarter</option>
        </select>
      </div>

      {/* SVG Chart Area */}
      <div style={{ position: 'relative', width: '100%', minHeight: 220, overflow: 'hidden' }}>
        <svg
          viewBox="0 0 600 220"
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        >
          {/* Grid lines */}
          <line x1="40" y1="20" x2="580" y2="20" stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <text x="15" y="24" fill="var(--text-muted)" fontSize="10" fontWeight="600">200</text>

          <line x1="40" y1="65" x2="580" y2="65" stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <text x="15" y="69" fill="var(--text-muted)" fontSize="10" fontWeight="600">150</text>

          <line x1="40" y1="110" x2="580" y2="110" stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <text x="15" y="114" fill="var(--text-muted)" fontSize="10" fontWeight="600">100</text>

          <line x1="40" y1="155" x2="580" y2="155" stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <text x="20" y="159" fill="var(--text-muted)" fontSize="10" fontWeight="600">50</text>

          <line x1="40" y1="195" x2="580" y2="195" stroke="var(--border-subtle)" />
          <text x="25" y="199" fill="var(--text-muted)" fontSize="10" fontWeight="600">0</text>

          {/* Solid Line: Internal Dept (Indigo) */}
          <path
            d="M 50 145 C 90 140, 130 130, 170 132 C 210 134, 240 120, 280 102 C 320 85, 360 82, 400 88 C 440 94, 480 72, 520 62 C 540 58, 560 55, 570 52"
            fill="none"
            stroke="#6366f1"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Dots on Internal Line */}
          {[
            [50, 145], [120, 132], [195, 135], [280, 102], [360, 84], [435, 90], [515, 64], [570, 52]
          ].map(([cx, cy], i) => (
            <circle
              key={`dot1-${i}`}
              cx={cx}
              cy={cy}
              r="4.5"
              fill="#ffffff"
              stroke="#6366f1"
              strokeWidth="2.5"
            />
          ))}

          {/* Dashed Line: Cross-Dept / Collab (Teal) */}
          <path
            d="M 50 178 C 90 170, 130 165, 170 166 C 210 167, 240 148, 280 140 C 320 132, 360 130, 400 125 C 440 120, 480 105, 520 95 C 540 90, 560 85, 570 82"
            fill="none"
            stroke="#10b981"
            strokeWidth="3"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />

          {/* Dots on Collab Line */}
          {[
            [50, 178], [120, 166], [195, 168], [280, 140], [360, 128], [435, 122], [515, 97], [570, 82]
          ].map(([cx, cy], i) => (
            <circle
              key={`dot2-${i}`}
              cx={cx}
              cy={cy}
              r="4"
              fill="#ffffff"
              stroke="#10b981"
              strokeWidth="2"
            />
          ))}

          {/* X Axis Week Labels */}
          {['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'].map((wk, i) => (
            <text
              key={wk}
              x={50 + i * 74}
              y="215"
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="10"
              fontWeight="600"
            >
              {wk}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          paddingTop: 8,
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 16, height: 3.5, background: '#6366f1', borderRadius: 2 }} />
          <span>Internal Dept.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 16,
              height: 0,
              borderTop: '2.5px dashed #10b981',
            }}
          />
          <span>Cross-Dept. (Collab)</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Home Page Component ─────────────────────────────
export default function HomePage() {
  const { currentUser } = useRole();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [leaderboardTab, setLeaderboardTab] = useState<'members' | 'depts'>('members');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [recognitionTypeFilter, setRecognitionTypeFilter] = useState('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [depts, allUsers, subs, pts] = await Promise.all([
        departmentService.getAllDepartments(),
        userService.getAllUsers(),
        submissionService.getSubmissions(),
        submissionService.getTotalPointsAwarded(),
      ]);
      setDepartments(depts);
      setUsers(allUsers);
      setSubmissions(subs);
      setTotalPoints(pts);
    } catch (err: unknown) {
      logger.error('[HomePage] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Listen for contributions submitted from TopBar modal
  useEffect(() => {
    const handleReload = () => loadAll();
    window.addEventListener('contribution-submitted', handleReload);
    return () => window.removeEventListener('contribution-submitted', handleReload);
  }, [loadAll]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === 'pending'),
    [submissions]
  );

  const approvedSubmissions = useMemo(
    () => submissions.filter((s) => s.status === 'approved'),
    [submissions]
  );

  // Top 5 members for leaderboard
  const topMembers = useMemo(() => {
    let filtered = [...users];
    if (selectedDeptFilter !== 'all') {
      filtered = filtered.filter((u) => u.deptId === selectedDeptFilter);
    }
    return filtered.sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5);
  }, [users, selectedDeptFilter]);

  const topScore = topMembers[0]?.totalPoints || 1;

  // Department scores for leaderboard
  const topDepts = useMemo(() => {
    return [...departments]
      .map((d) => {
        const deptPoints = users
          .filter((u) => u.deptId === d.id)
          .reduce((sum, u) => sum + u.totalPoints, 0);
        return { ...d, totalPoints: deptPoints };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5);
  }, [departments, users]);

  // Recent recognition items
  const recentFeed = useMemo(() => {
    let feed = approvedSubmissions.length > 0 ? approvedSubmissions : submissions;
    if (recognitionTypeFilter !== 'all') {
      feed = feed.filter((s) => s.category === recognitionTypeFilter);
    }
    return feed.slice(0, 5);
  }, [approvedSubmissions, submissions, recognitionTypeFilter]);

  // Handle inline approvals for pending queue
  const handleApprove = async (id: string) => {
    const canApprove = ROLE_RANK[currentUser.role] >= ROLE_RANK['dept-head'];
    if (!canApprove) {
      setActionFeedback('Approval requires Dept Head or Leader role permissions.');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    try {
      await submissionService.approveSubmission(id, currentUser.id);
      setActionFeedback('Submission approved successfully!');
      loadAll();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: unknown) {
      logger.error('Failed to approve submission:', err);
    }
  };

  const handleReject = async (id: string) => {
    const canApprove = ROLE_RANK[currentUser.role] >= ROLE_RANK['dept-head'];
    if (!canApprove) {
      setActionFeedback('Rejection requires Dept Head or Leader role permissions.');
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    try {
      await submissionService.rejectSubmission(id, currentUser.id);
      setActionFeedback('Submission rejected.');
      loadAll();
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err: unknown) {
      logger.error('Failed to reject submission:', err);
    }
  };

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          className="animate-slide-down"
          style={{
            position: 'fixed',
            top: 80,
            right: 32,
            zIndex: 100,
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--border-active)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.15)',
            padding: '12px 20px',
            borderRadius: 12,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ShieldAlert size={16} style={{ color: 'var(--accent-indigo)' }} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* ── Top Row Stat Cards (4 columns) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}
      >
        <StatCard
          label="Total Contributions"
          value={submissions.length > 0 ? (submissions.length * 48 + 3842).toLocaleString() : '3,842'}
          trend="↑ 12%"
          subtext="vs last quarter"
          icon={<TrendingUp size={20} />}
          delay={50}
        />
        <StatCard
          label="Active Committees"
          value={departments.length > 0 ? departments.length : '9'}
          subtext={`across ${departments.length || 4} departments`}
          icon={<Users size={20} />}
          delay={100}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingSubmissions.length}
          trend={`${pendingSubmissions.length} awaiting`}
          trendPositive={false}
          subtext="in workflow queue"
          icon={<Clock size={20} />}
          delay={150}
        />
        <StatCard
          label="Total Reward Points"
          value={totalPoints > 0 ? totalPoints.toLocaleString() : '24,910'}
          trend="↑ 8%"
          subtext="vs last quarter"
          icon={<Sparkles size={20} />}
          delay={200}
        />
      </div>

      {/* ── Two-Column Middle Layout: Chart + Leaderboard ── */}
      <div className="cb-grid-2col">
        {/* Left: Contribution Trends Line Chart */}
        <div>
          <ContributionTrendsChart />
        </div>

        {/* Right: Leaderboard Mini Panel */}
        <div
          className="glass-card animate-fade-in-up"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            height: '100%',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Leaderboard
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Dept Filter */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="custom-select"
                style={{ padding: '4px 26px 4px 10px', fontSize: '0.76rem', width: 'auto' }}
              >
                <option value="all">All Depts</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.shortName}
                  </option>
                ))}
              </select>

              {/* Members / Depts Toggle */}
              <div className="filter-segmented">
                <button
                  onClick={() => setLeaderboardTab('members')}
                  className={`filter-segment-btn ${leaderboardTab === 'members' ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                >
                  Members
                </button>
                <button
                  onClick={() => setLeaderboardTab('depts')}
                  className={`filter-segment-btn ${leaderboardTab === 'depts' ? 'active' : ''}`}
                  style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                >
                  Depts
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            {leaderboardTab === 'members' ? (
              topMembers.map((member, idx) => {
                const memberDept = deptMap.get(member.deptId);
                const percent = Math.min(100, Math.round((member.totalPoints / topScore) * 100));

                return (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: idx % 2 === 0 ? 'var(--bg-subtle)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* Rank */}
                    <span
                      style={{
                        width: 22,
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--text-muted)',
                        textAlign: 'center',
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* Avatar */}
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: `${member.avatarColor}25`,
                        border: `1.5px solid ${member.avatarColor}`,
                        color: member.avatarColor,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
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
                    </span>

                    {/* Name & Department */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {member.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginTop: 2,
                        }}
                      >
                        <span>{memberDept?.name || 'Department'}</span>
                        <span
                          style={{
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: 'var(--accent-green)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                          }}
                        >
                          → {member.totalPoints}
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div
                        style={{
                          height: 3,
                          width: '100%',
                          background: 'var(--border-subtle)',
                          borderRadius: 2,
                          marginTop: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #6366f1, #10b981)',
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>

                    {/* Points Score */}
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'right',
                      }}
                    >
                      {member.totalPoints}
                    </div>
                  </div>
                );
              })
            ) : (
              topDepts.map((dept, idx) => (
                <div
                  key={dept.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: idx % 2 === 0 ? 'var(--bg-subtle)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{dept.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dept.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {dept.memberCount} members
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: dept.color }}>
                    {dept.totalPoints}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Collaboration Impact Footer */}
          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                marginBottom: 6,
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Collaboration impact</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>+12% boost applied</span>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '68%',
                  height: '100%',
                  background: 'var(--accent-green)',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-Column Bottom Layout: Approval Queue + Recent Recognition ── */}
      <div className="cb-grid-2col">
        {/* Left: Approval Workflow Queue */}
        <div
          className="glass-card animate-fade-in-up"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Approval Workflow Queue
            </h2>

            <span
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-amber)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {pendingSubmissions.length} pending
            </span>
          </div>

          {/* Queue List */}
          {pendingSubmissions.length === 0 ? (
            <EmptyState
              icon="✓"
              title="All Caught Up!"
              description="No pending submissions requiring approval right now."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingSubmissions.slice(0, 5).map((sub) => {
                const submitter = userMap.get(sub.submitterId);
                const targetDept = deptMap.get(sub.target_dept);

                return (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: `${submitter?.avatarColor ?? '#6366f1'}20`,
                          border: `1.5px solid ${submitter?.avatarColor ?? '#6366f1'}`,
                          color: submitter?.avatarColor ?? '#6366f1',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {submitter?.avatarInitials ?? 'CB'}
                      </span>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.86rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {submitter?.name ?? 'Team Member'}
                        </div>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{sub.category || 'Contribution log'}</span>
                          <span>·</span>
                          <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                            Awaiting Approval
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {relativeTime(sub.createdAt)}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => handleApprove(sub.id)}
                          aria-label="Approve submission"
                          title="Approve"
                          className="btn-action-approve"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(sub.id)}
                          aria-label="Reject submission"
                          title="Reject"
                          className="btn-action-reject"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Recognition */}
        <div
          className="glass-card animate-fade-in-up"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              Recent Recognition
            </h2>

            <select
              value={recognitionTypeFilter}
              onChange={(e) => setRecognitionTypeFilter(e.target.value)}
              className="custom-select"
              style={{ padding: '4px 26px 4px 10px', fontSize: '0.76rem', width: 'auto' }}
            >
              <option value="all">All Types</option>
              <option value="collaboration">Collaboration</option>
              <option value="delivery">Delivery</option>
              <option value="leadership">Leadership</option>
              <option value="innovation">Innovation</option>
              <option value="culture">Culture</option>
            </select>
          </div>

          {/* Feed list */}
          {recentFeed.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No recognitions yet"
              description="Be the first to award points to a teammate using '+ Log Contribution' above."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentFeed.map((item) => {
                const submitter = userMap.get(item.submitterId);
                const target = userMap.get(item.targetUserId);
                const targetDept = deptMap.get(item.target_dept);
                const catMeta = CATEGORY_META[item.category] || {
                  icon: '🤝',
                  color: 'var(--accent-indigo)',
                };

                const tierClass =
                  item.points === 1 ? 'tier-1' :
                  item.points === 2 ? 'tier-2' :
                  item.points === 3 ? 'tier-3' :
                  item.points === 4 ? 'tier-4' : 'tier-5';

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: `${target?.avatarColor ?? '#6366f1'}20`,
                        border: `1.5px solid ${target?.avatarColor ?? '#6366f1'}`,
                        color: target?.avatarColor ?? '#6366f1',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {target?.avatarInitials ?? 'TM'}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                          {target?.name ?? 'Member'}
                        </strong>{' '}
                        earned points for{' '}
                        <strong style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>
                          {item.category}
                        </strong>
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          marginTop: 4,
                        }}
                      >
                        <span>{targetDept?.name || 'Engineering'}</span>
                        <span>·</span>
                        <span>{relativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Point Tier Badge */}
                    <span className={`tier-badge ${tierClass}`} style={{ flexShrink: 0 }}>
                      +{item.points} pts
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Full Recognition Feed link */}
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <Link
              href="/submissions"
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--accent-indigo)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>View full recognition feed</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
