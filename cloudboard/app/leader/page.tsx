'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRole } from '@/lib/roleContext';
import {
  Department,
  User,
  PointSubmission,
} from '@/lib/services/types';
import {
  userService,
  submissionService,
  departmentService,
} from '@/lib/services';
import { useRouter } from 'next/navigation';
import { formatDate, relativeTime, getBadgeColors, getRoleMeta } from '@/lib/utils';
import { logger } from '@/lib/logger';
import EmptyState from '@/components/ui/EmptyState';
import {
  Sparkles,
  Users,
  Trophy,
  Building2,
  GraduationCap,
  Search,
  CheckCircle2,
  Lock,
  Pencil,
  ArrowRight,
  Check,
  X,
  Clock,
} from 'lucide-react';

// ─── Stat Card ────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="glass-card stat-card animate-fade-in-up"
      style={{
        padding: '22px 24px',
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
              fontSize: '0.74rem',
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
        <p
          style={{
            fontSize: '2.1rem',
            fontWeight: 800,
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
        <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 6 }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

// ─── Certificate Generation Trigger ───────────────────────────

function CertificateSection({
  onTrigger,
  eligibleCount,
  deptCount,
}: {
  onTrigger: () => void;
  eligibleCount: number;
  deptCount: number;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onTrigger();
    }, 1200);
  };

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ color: 'var(--accent-indigo)' }}><GraduationCap size={20} /></span>
          <h3
            style={{
              fontSize: '1.08rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Quarterly Performance Certificates
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 4 }}>
          Generate and distribute certificates to all top performers this quarter.
          Prepares personalized recognition packs across all departments.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: 'var(--accent-amber)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {eligibleCount}
          </p>
          <p
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginTop: 1,
              fontWeight: 700,
            }}
          >
            Eligible Members
          </p>
        </div>
        <div style={{ width: 1, height: 32, background: 'var(--border-subtle)' }} />
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: 'var(--accent-green)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deptCount}
          </p>
          <p
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginTop: 1,
              fontWeight: 700,
            }}
          >
            Depts Covered
          </p>
        </div>

        <button
          id="trigger-certificates-btn"
          onClick={handleClick}
          disabled={loading}
          className="cb-btn-primary"
          style={{
            padding: '10px 22px',
            fontSize: '0.84rem',
            whiteSpace: 'nowrap',
          }}
        >
          <GraduationCap size={16} />
          <span>{loading ? 'Generating...' : 'Generate Certificates'}</span>
        </button>
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────

function ActivityFeed({
  submissions,
  userMap,
  deptMap,
}: {
  submissions: PointSubmission[];
  userMap: Map<string, User>;
  deptMap: Map<string, Department>;
}) {
  const [expanded, setExpanded] = useState(false);

  const feedItems = useMemo(() => {
    return [...submissions]
      .filter((s) => s.status === 'approved' || (s.cross_dept && s.status !== 'pending'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, expanded ? 25 : 10);
  }, [submissions, expanded]);

  const totalApproved = submissions.filter((s) => s.status === 'approved').length;
  const totalCross = submissions.filter((s) => s.cross_dept && s.status === 'approved').length;

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
            Activity Feed
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Recent point confirmations & cross-dept approvals
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-green)', fontVariantNumeric: 'tabular-nums' }}>
              {totalApproved}
            </p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              approved
            </p>
          </div>
          <div style={{ width: 1, background: 'var(--border-subtle)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-indigo)', fontVariantNumeric: 'tabular-nums' }}>
              {totalCross}
            </p>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              cross-dept
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxHeight: expanded ? 600 : 380, overflowY: 'auto' }}>
        {feedItems.length === 0 ? (
          <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No activity yet
          </div>
        ) : (
          feedItems.map((sub, i) => {
            const submitter = userMap.get(sub.submitterId);
            const recipient = userMap.get(sub.targetUserId);
            const targetDept = deptMap.get(sub.target_dept);
            const isLastItem = i === feedItems.length - 1;

            const tierClass =
              sub.points === 1 ? 'tier-1' :
              sub.points === 2 ? 'tier-2' :
              sub.points === 3 ? 'tier-3' :
              sub.points === 4 ? 'tier-4' : 'tier-5';

            return (
              <div
                key={sub.id}
                style={{
                  padding: '14px 20px',
                  borderBottom: isLastItem ? 'none' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {submitter?.name.split(' ')[0] ?? '—'}
                    </strong>{' '}
                    recognised{' '}
                    <strong style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {recipient?.name.split(' ')[0] ?? '—'}
                    </strong>
                    {sub.cross_dept && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: 'var(--accent-indigo)',
                          background: 'var(--accent-indigo-subtle)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: 4,
                          padding: '1px 6px',
                          verticalAlign: 'middle',
                        }}
                      >
                        🔗 Cross
                      </span>
                    )}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {sub.category}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {targetDept?.shortName}
                    </span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-subtle)' }} />
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: sub.status === 'approved' ? 'var(--status-approved-text)' : 'var(--status-rejected-text)',
                      }}
                    >
                      {sub.status === 'approved' ? '✓ approved' : '✕ rejected'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }} title={formatDate(sub.createdAt)}>
                      {relativeTime(sub.createdAt)}
                    </span>
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span className={`tier-badge ${tierClass}`}>
                    +{sub.points}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {submissions.filter((s) => s.status !== 'pending').length > 10 && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="cb-btn-ghost"
            style={{ width: '100%', fontSize: '0.78rem' }}
          >
            {expanded ? '↑ Collapse feed' : '↓ See more activity'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Point Override Input ──────────────────────────────────────

function PointOverrideCell({
  user,
  onOverride,
}: {
  user: User;
  onOverride: (userId: string, newPoints: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(user.totalPoints));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(String(user.totalPoints));
  }, [user.totalPoints]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleSave = () => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      setValue(String(user.totalPoints));
      setEditing(false);
      return;
    }
    onOverride(user.id, parsed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setValue(String(user.totalPoints));
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          ref={inputRef}
          type="number"
          value={value}
          min={0}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          style={{
            width: 80,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1.5px solid var(--accent-indigo)',
            background: 'var(--bg-card)',
            color: 'var(--accent-indigo)',
            fontSize: '0.84rem',
            fontWeight: 800,
            outline: 'none',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      onClick={() => setEditing(true)}
      title="Click to override points"
    >
      <span
        style={{
          fontWeight: 800,
          fontSize: '0.96rem',
          letterSpacing: '-0.03em',
          color: 'var(--accent-amber)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {user.totalPoints.toLocaleString()}
      </span>
      <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
    </div>
  );
}

// ─── All Department Submissions Section ────────────────────────

function AllDepartmentSubmissionsSection({
  submissions,
  userMap,
  deptMap,
  departments,
  onApprove,
  onReject,
}: {
  submissions: PointSubmission[];
  userMap: Map<string, User>;
  deptMap: Map<string, Department>;
  departments: Department[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const pendingSubs = useMemo(() => {
    return submissions.filter((s) => {
      if (s.status !== 'pending') return false;
      if (selectedDept !== 'all') {
        return s.home_dept === selectedDept || s.target_dept === selectedDept;
      }
      return true;
    });
  }, [submissions, selectedDept]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActioningId(id);
    if (action === 'approve') {
      await onApprove(id);
    } else {
      await onReject(id);
    }
    setActioningId(null);
  };

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Cross-Department Pending Approvals
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--accent-amber)',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 6,
                padding: '2px 8px',
              }}
            >
              Executive Authority
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
            Review, override, and approve pending submissions from every department
          </p>
        </div>

        {/* Dept Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="custom-select"
            style={{ width: 'auto', minWidth: 170, fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <option value="all">All Departments ({submissions.filter((s) => s.status === 'pending').length})</option>
            {departments.map((d) => {
              const count = submissions.filter(
                (s) => s.status === 'pending' && (s.home_dept === d.id || s.target_dept === d.id)
              ).length;
              return (
                <option key={d.id} value={d.id}>
                  {d.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {pendingSubs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            border: '1.5px dashed var(--border-subtle)',
            borderRadius: 12,
            background: 'var(--bg-subtle)',
          }}
        >
          <CheckCircle2 size={32} style={{ color: 'var(--accent-green)', margin: '0 auto 10px', opacity: 0.8 }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            All caught up!
          </p>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 4 }}>
            No pending submissions require approval for this filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 14 }}>
          {pendingSubs.map((sub) => {
            const submitter = userMap.get(sub.submitterId);
            const targetUser = userMap.get(sub.targetUserId);
            const homeDept = deptMap.get(sub.home_dept);
            const targetDept = deptMap.get(sub.target_dept);
            const isActioning = actioningId === sub.id;

            return (
              <div
                key={sub.id}
                style={{
                  padding: '16px',
                  borderRadius: 12,
                  background: 'var(--bg-subtle)',
                  border: '1.5px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: `${targetUser?.avatarColor || '#6366f1'}20`,
                        border: `1.5px solid ${targetUser?.avatarColor || '#6366f1'}`,
                        color: targetUser?.avatarColor || '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {targetUser?.avatarInitials || '??'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {submitter?.name || 'Unknown'} → <span style={{ color: 'var(--accent-indigo)' }}>{targetUser?.name || 'Unknown'}</span>
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {homeDept?.shortName} {sub.cross_dept && `⇄ ${targetDept?.shortName}`} · {relativeTime(sub.createdAt)}
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '3px 9px',
                      borderRadius: 6,
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: 'var(--accent-amber)',
                      flexShrink: 0,
                    }}
                  >
                    +{sub.points} pts
                  </span>
                </div>

                {/* Reason */}
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-card)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  &ldquo;{sub.reason}&rdquo;
                </p>

                {/* Approver requested note */}
                {sub.requestedApproverRole && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Routing: Requested {sub.requestedApproverRole === 'leader' ? 'Executive Leader' : 'Dept Head'} approval</span>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button
                    disabled={isActioning}
                    onClick={() => handleAction(sub.id, 'approve')}
                    className="cb-btn-primary"
                    style={{ flex: 1, padding: '7px 12px', fontSize: '0.78rem', justifyContent: 'center' }}
                  >
                    <Check size={14} /> Approve (+{sub.points} pts)
                  </button>
                  <button
                    disabled={isActioning}
                    onClick={() => handleAction(sub.id, 'reject')}
                    className="cb-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.78rem', color: 'var(--status-rejected-text)' }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Leader Approval Audit Section ─────────────────────────────
// Requirement: "only leader should see the time dep head approve a entry and the details"

function LeaderApprovalAuditSection({
  submissions,
  userMap,
  deptMap,
  departments,
}: {
  submissions: PointSubmission[];
  userMap: Map<string, User>;
  deptMap: Map<string, Department>;
  departments: Department[];
}) {
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const approvedSubs = useMemo(() => {
    return submissions
      .filter((s) => s.status === 'approved')
      .filter((s) => {
        if (deptFilter !== 'all') {
          return s.home_dept === deptFilter || s.target_dept === deptFilter;
        }
        return true;
      })
      .filter((s) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const submitter = userMap.get(s.submitterId)?.name.toLowerCase() || '';
        const target = userMap.get(s.targetUserId)?.name.toLowerCase() || '';
        const approver = s.approvedBy ? userMap.get(s.approvedBy)?.name.toLowerCase() || '' : '';
        const reason = s.reason.toLowerCase();
        return submitter.includes(q) || target.includes(q) || approver.includes(q) || reason.includes(q);
      })
      .sort((a, b) => {
        const timeA = a.reviewedAt ? new Date(a.reviewedAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.reviewedAt ? new Date(b.reviewedAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
  }, [submissions, deptFilter, search, userMap]);

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Executive Approval & Audit Trail
            </h3>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#818cf8',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 6,
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Lock size={10} /> Leader-Only Audit View
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
            Verified timestamps, approving authority details, and full submission context across all departments
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="topbar-search" style={{ width: 180 }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search audit log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="custom-select"
            style={{ width: 'auto', minWidth: 150, fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cb-table-wrapper" style={{ maxHeight: 440, overflowY: 'auto' }}>
        <table className="cb-table">
          <thead>
            <tr>
              <th>Contributor & Target</th>
              <th>Dept</th>
              <th>Points & Category</th>
              <th>Approving Authority</th>
              <th>Approval Timestamp</th>
              <th>Contribution Details</th>
            </tr>
          </thead>
          <tbody>
            {approvedSubs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No approved entries found matching the filter.
                </td>
              </tr>
            ) : (
              approvedSubs.map((sub) => {
                const submitter = userMap.get(sub.submitterId);
                const recipient = userMap.get(sub.targetUserId);
                const targetDept = deptMap.get(sub.target_dept);
                const homeDept = deptMap.get(sub.home_dept);
                const approver = sub.approvedBy ? userMap.get(sub.approvedBy) : null;
                const approverName = approver?.name || sub.approvedByName || (sub.approvedBy ? `ID: ${sub.approvedBy.slice(0, 12)}...` : 'Dept Head');
                const approverRoleMeta = approver ? getRoleMeta(approver.role) : null;
                const approverBadge = approver ? getBadgeColors(approver.role) : null;

                const approvalFormatted = sub.reviewedAt
                  ? new Date(sub.reviewedAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : formatDate(sub.createdAt);

                return (
                  <tr key={sub.id}>
                    <td>
                      <div>
                        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {submitter?.name || 'Member'} → <span style={{ color: 'var(--accent-indigo)' }}>{recipient?.name || 'Member'}</span>
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Submitted {relativeTime(sub.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {homeDept?.shortName} {sub.cross_dept && `⇄ ${targetDept?.shortName}`}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            color: 'var(--accent-green)',
                          }}
                        >
                          +{sub.points} pts
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          · {sub.category}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {approverName}
                        </p>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            color: approverBadge?.text || 'var(--text-muted)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {approverRoleMeta?.label || 'Approver'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-indigo)' }}>
                          {approvalFormatted}
                        </p>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {sub.reviewedAt ? relativeTime(sub.reviewedAt) : 'Logged'}
                        </p>
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                        title={sub.reason}
                      >
                        {sub.reason}
                      </p>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function LeaderDashboardPage() {
  const { currentUser, isLeader } = useRole();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!isLeader) {
      router.replace('/');
    }
  }, [isLeader, router]);

  const loadData = useCallback(async () => {
    try {
      const [allUsers, depts, subs, pts] = await Promise.all([
        userService.getAllUsers(),
        departmentService.getAllDepartments(),
        submissionService.getSubmissions(),
        submissionService.getTotalPointsAwarded(),
      ]);
      setUsers(allUsers);
      setDepartments(depts);
      setSubmissions(subs);
      setTotalPoints(pts);
    } catch (err: unknown) {
      logger.error('[LeaderDashboardPage] Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    if (isLeader) {
      loadData();
    }
  }, [isLeader, loadData]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePointOverride = async (userId: string, newPoints: number) => {
    try {
      await userService.overrideMemberPoints(currentUser.id, userId, newPoints);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, totalPoints: newPoints } : u))
      );
      showToast('Member points successfully updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update points', 'info');
    }
  };

  const handleApprove = async (subId: string) => {
    try {
      const updated = await submissionService.approveSubmission(subId, currentUser.id);
      setSubmissions((prev) => prev.map((s) => (s.id === subId ? updated : s)));
      const [freshUsers, pts] = await Promise.all([
        userService.getAllUsers(),
        submissionService.getTotalPointsAwarded(),
      ]);
      setUsers(freshUsers);
      setTotalPoints(pts);
      showToast(`Submission approved (+${updated.points} pts awarded)`, 'success');
      window.dispatchEvent(new CustomEvent('contribution-submitted'));
    } catch (err: any) {
      showToast(err.message || 'Failed to approve submission', 'info');
    }
  };

  const handleReject = async (subId: string) => {
    try {
      const updated = await submissionService.rejectSubmission(subId, currentUser.id);
      setSubmissions((prev) => prev.map((s) => (s.id === subId ? updated : s)));
      showToast('Submission rejected', 'info');
      window.dispatchEvent(new CustomEvent('contribution-submitted'));
    } catch (err: any) {
      showToast(err.message || 'Failed to reject submission', 'info');
    }
  };

  const filteredMembers = useMemo(() => {
    return users.filter((u) => {
      if (deptFilter !== 'all' && u.deptId !== deptFilter) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (search && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [users, deptFilter, roleFilter, search]);

  const topPerformers = useMemo(() => {
    return [...users].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);
  }, [users]);

  if (!isLeader) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Access Restricted
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          This page is only accessible to Organization Leadership.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="animate-slide-down"
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 200,
            padding: '12px 20px',
            borderRadius: 12,
            background: 'var(--status-approved-bg)',
            border: '1px solid var(--status-approved-border)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'var(--status-approved-text)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
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
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--accent-amber)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            Executive View
          </span>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              marginTop: 6,
              marginBottom: 2,
            }}
          >
            Leader Oversight & Governance
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Organization-wide visibility, manual point governance, and quarterly performance certificates
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
            Executive Level Authority
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
        <StatCard
          label="Total Points Awarded"
          value={totalPoints.toLocaleString()}
          sub="Org-wide approved points"
          icon={<Sparkles size={20} />}
        />
        <StatCard
          label="Active Members"
          value={users.length}
          sub="Across all departments"
          icon={<Users size={20} />}
        />
        <StatCard
          label="Top Performer"
          value={topPerformers[0]?.totalPoints.toLocaleString() ?? '0'}
          sub={topPerformers[0]?.name ?? 'None'}
          icon={<Trophy size={20} />}
        />
        <StatCard
          label="Departments"
          value={departments.length}
          sub="Active teams"
          icon={<Building2 size={20} />}
        />
      </div>

      {/* All Department Submissions Approval Queue */}
      <AllDepartmentSubmissionsSection
        submissions={submissions}
        userMap={userMap}
        deptMap={deptMap}
        departments={departments}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Leader-Only Approval & Audit Log */}
      <LeaderApprovalAuditSection
        submissions={submissions}
        userMap={userMap}
        deptMap={deptMap}
        departments={departments}
      />

      {/* Certificate Trigger */}
      <CertificateSection
        eligibleCount={users.filter((u) => u.totalPoints >= 300).length}
        deptCount={departments.length}
        onTrigger={() => showToast('Quarterly certificates successfully queued for delivery', 'success')}
      />

      {/* Main 2-column: Governance Table & Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24, alignItems: 'start' }}>
        {/* Left: Member Directory & Point Override */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                Member Governance
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                View members and click point totals to adjust points
              </p>
            </div>
            <div className="topbar-search" style={{ width: 200 }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search member..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="cb-table-wrapper" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table className="cb-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Dept</th>
                  <th>Points (Edit)</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const meta = getRoleMeta(member?.role);
                  const bc = getBadgeColors(member?.role);
                  const dept = deptMap.get(member.deptId);

                  return (
                    <tr key={member.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: `${member.avatarColor}20`,
                              border: `1.5px solid ${member.avatarColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: member.avatarColor,
                              flexShrink: 0,
                            }}
                          >
                            {member.avatarInitials}
                          </div>
                          <div>
                            <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {member.name}
                            </p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Member since {member.joinDate}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: bc.text,
                            background: bc.bg,
                            border: `1px solid ${bc.border}`,
                            borderRadius: 4,
                            padding: '2px 7px',
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {dept?.shortName}
                        </span>
                      </td>
                      <td>
                        <PointOverrideCell user={member} onOverride={handlePointOverride} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Activity Feed */}
        <ActivityFeed submissions={submissions} userMap={userMap} deptMap={deptMap} />
      </div>
    </div>
  );
}
