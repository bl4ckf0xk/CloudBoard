'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRole } from '@/lib/roleContext';
import {
  Department,
  User,
  PointSubmission,
  DeptId,
} from '@/lib/services/types';
import {
  submissionService,
  departmentService,
  userService,
} from '@/lib/services';
import { useRouter } from 'next/navigation';
import { formatDate, relativeTime, CATEGORY_META } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Check, X, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

// ─── Submission Card ──────────────────────────────────────────

interface SubmissionCardProps {
  sub: PointSubmission;
  isCrossIncoming?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actioned: 'approved' | 'rejected' | null;
  userMap: Map<string, User>;
  deptMap: Map<string, Department>;
}

function SubmissionCard({
  sub,
  isCrossIncoming,
  onApprove,
  onReject,
  actioned,
  userMap,
  deptMap,
}: SubmissionCardProps) {
  const submitter = userMap.get(sub.submitterId);
  const recipient = userMap.get(sub.targetUserId);
  const homeDept = deptMap.get(sub.home_dept);
  const targetDept = deptMap.get(sub.target_dept);
  const catMeta = CATEGORY_META[sub.category] ?? {
    icon: '◉',
    color: 'var(--accent-indigo)',
    bg: 'var(--accent-indigo-subtle)',
    border: 'rgba(99, 102, 241, 0.3)',
  };

  const tierClass =
    sub.points === 1 ? 'tier-1' :
    sub.points === 2 ? 'tier-2' :
    sub.points === 3 ? 'tier-3' :
    sub.points === 4 ? 'tier-4' : 'tier-5';

  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        background: actioned ? 'var(--bg-muted)' : 'var(--bg-card)',
        border: `1.5px solid ${isCrossIncoming ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)'}`,
        opacity: actioned ? 0.6 : 1,
        transition: 'all 0.25s ease',
        pointerEvents: actioned ? 'none' : 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top row: submitter → recipient */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {/* Submitter avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            flexShrink: 0,
            background: `${submitter?.avatarColor ?? '#6366f1'}20`,
            border: `2px solid ${submitter?.avatarColor ?? '#6366f1'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: submitter?.avatarColor ?? '#6366f1',
          }}
        >
          {submitter?.avatarInitials ?? '?'}
        </div>
        <ArrowRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        {/* Recipient avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            flexShrink: 0,
            background: `${recipient?.avatarColor ?? '#10b981'}20`,
            border: `2px solid ${recipient?.avatarColor ?? '#10b981'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: recipient?.avatarColor ?? '#10b981',
          }}
        >
          {recipient?.avatarInitials ?? '?'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
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
            {submitter?.name ?? '—'}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, margin: '0 5px' }}>→</span>
            {recipient?.name ?? '—'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {homeDept?.shortName}
            </span>
            {sub.cross_dept && (
              <>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>⇄</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {targetDept?.shortName}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Points tier badge */}
        <div style={{ flexShrink: 0 }}>
          <span className={`tier-badge ${tierClass}`} style={{ fontSize: '0.82rem', padding: '4px 10px' }}>
            +{sub.points} pts
          </span>
        </div>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'capitalize',
            color: catMeta.color,
            background: catMeta.bg,
            border: `1px solid ${catMeta.border}`,
            borderRadius: 5,
            padding: '2px 8px',
          }}
        >
          {catMeta.icon} {sub.category}
        </span>
        {sub.cross_dept && (
          <span
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--accent-indigo)',
              background: 'var(--accent-indigo-subtle)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 5,
              padding: '2px 8px',
            }}
          >
            🔗 Cross-Dept
          </span>
        )}
        <span
          style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}
          title={formatDate(sub.createdAt)}
        >
          {relativeTime(sub.createdAt)}
        </span>
      </div>

      {/* Reason */}
      <div
        style={{
          fontSize: '0.82rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          borderLeft: `3px solid ${isCrossIncoming ? 'var(--accent-indigo)' : 'var(--accent-green)'}`,
          marginBottom: 14,
          fontStyle: 'italic',
          background: 'var(--bg-muted)',
          borderRadius: '0 8px 8px 0',
          padding: '10px 12px',
        }}
      >
        &ldquo;{sub.reason}&rdquo;
      </div>

      {/* Action buttons or actioned state */}
      {actioned ? (
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
            color: actioned === 'approved' ? 'var(--status-approved-text)' : 'var(--status-rejected-text)',
            padding: '8px',
            borderRadius: 8,
            background: actioned === 'approved' ? 'var(--status-approved-bg)' : 'var(--status-rejected-bg)',
            border: `1px solid ${actioned === 'approved' ? 'var(--status-approved-border)' : 'var(--status-rejected-border)'}`,
          }}
        >
          {actioned === 'approved' ? '✓ Approved' : '✕ Rejected'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onReject(sub.id)}
            className="cb-btn-ghost"
            style={{
              flex: 1,
              background: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '8px 14px',
            }}
          >
            <X size={15} />
            <span>Reject</span>
          </button>
          <button
            onClick={() => onApprove(sub.id)}
            className="cb-btn-primary"
            style={{ flex: 2, fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <Check size={16} />
            <span>Approve (+{sub.points} pts)</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Queue Section ────────────────────────────────────────────

function QueueSection({
  title,
  subtitle,
  accentColor,
  queue,
  isCrossIncoming,
  actionedMap,
  onApprove,
  onReject,
  userMap,
  deptMap,
}: {
  title: string;
  subtitle: string;
  accentColor: string;
  queue: PointSubmission[];
  isCrossIncoming: boolean;
  actionedMap: Record<string, 'approved' | 'rejected'>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  userMap: Map<string, User>;
  deptMap: Map<string, Department>;
}) {
  const pending = queue.filter((s) => !actionedMap[s.id]);
  const actioned = queue.filter((s) => !!actionedMap[s.id]);

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        <div
          style={{
            background: pending.length > 0 ? `${accentColor}15` : 'var(--bg-muted)',
            border: `1.5px solid ${pending.length > 0 ? accentColor + '40' : 'var(--border-subtle)'}`,
            borderRadius: 12,
            padding: '6px 14px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: pending.length > 0 ? accentColor : 'var(--text-muted)',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pending.length}
          </span>
          <p
            style={{
              fontSize: '0.62rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginTop: 2,
              fontWeight: 700,
            }}
          >
            pending
          </p>
        </div>
      </div>

      {/* Cards */}
      {queue.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            border: `1.5px dashed var(--border-subtle)`,
            borderRadius: 14,
            background: 'var(--bg-card)',
          }}
        >
          <p style={{ fontSize: '1.8rem', marginBottom: 8 }}>✅</p>
          <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            All clear — no pending submissions
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {queue.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              isCrossIncoming={isCrossIncoming}
              onApprove={onApprove}
              onReject={onReject}
              actioned={actionedMap[sub.id] ?? null}
              userMap={userMap}
              deptMap={deptMap}
            />
          ))}
        </div>
      )}

      {/* Actioned items section */}
      {actioned.length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <p
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              marginBottom: 10,
            }}
          >
            Reviewed this session ({actioned.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actioned.map((sub) => (
              <SubmissionCard
                key={sub.id}
                sub={sub}
                isCrossIncoming={isCrossIncoming}
                onApprove={onApprove}
                onReject={onReject}
                actioned={actionedMap[sub.id] ?? null}
                userMap={userMap}
                deptMap={deptMap}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History Section ──────────────────────────────────────────

function HistorySection({
  deptId,
  deptName,
  deptColor,
  userMap,
}: {
  deptId: DeptId;
  deptName: string;
  deptColor: string;
  userMap: Map<string, User>;
}) {
  const [history, setHistory] = useState<PointSubmission[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    submissionService.getSubmissions().then((subs) => {
      if (isMounted) {
        const resolved = subs
          .filter(
            (s) =>
              (s.home_dept === deptId || s.target_dept === deptId) &&
              s.status !== 'pending'
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        setHistory(resolved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [deptId]);

  const displayed = expanded ? history : history.slice(0, 5);

  return (
    <div className="glass-card animate-fade-in-up" style={{ padding: '24px' }}>
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
              fontSize: '1.02rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: 3,
            }}
          >
            Submission History
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            All resolved submissions for {deptName}
          </p>
        </div>
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.8rem',
            color: deptColor,
            background: `${deptColor}15`,
            border: `1px solid ${deptColor}30`,
            borderRadius: 8,
            padding: '4px 12px',
          }}
        >
          {history.length} total
        </span>
      </div>

      <div className="cb-table-wrapper">
        <table className="cb-table">
          <thead>
            <tr>
              <th>From → To</th>
              <th>Category</th>
              <th>Points</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((sub) => {
              const submitter = userMap.get(sub.submitterId);
              const recipient = userMap.get(sub.targetUserId);
              const catMeta = CATEGORY_META[sub.category] ?? {
                icon: '◉',
                color: 'var(--accent-indigo)',
                bg: 'var(--accent-indigo-subtle)',
                border: 'rgba(99, 102, 241, 0.3)',
              };
              return (
                <tr key={sub.id}>
                  <td>
                    <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {submitter?.name.split(' ')[0] ?? '—'}
                      <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>→</span>
                      {recipient?.name.split(' ')[0] ?? '—'}
                    </p>
                    {sub.cross_dept && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: 'var(--accent-indigo)',
                          background: 'var(--accent-indigo-subtle)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        Cross-Dept
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        color: catMeta.color,
                        background: catMeta.bg,
                        border: `1px solid ${catMeta.border}`,
                        borderRadius: 5,
                        padding: '2px 8px',
                      }}
                    >
                      {catMeta.icon} {sub.category}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--accent-amber)' }}>
                      +{sub.points}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${sub.status}`}>
                      {sub.status === 'approved' && '✓ '}
                      {sub.status === 'rejected' && '✕ '}
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {relativeTime(sub.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {history.length > 5 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="cb-btn-ghost"
          style={{ marginTop: 16, width: '100%', fontSize: '0.82rem' }}
        >
          {expanded ? '↑ Show less' : `↓ Show all ${history.length} submissions`}
        </button>
      )}
    </div>
  );
}

// ─── Main Dept Head Page ──────────────────────────────────────

export default function DeptHeadPanelPage() {
  const { currentUser, isDeptHead, isLeader } = useRole();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<{
    homeDeptQueue: PointSubmission[];
    crossDeptQueue: PointSubmission[];
  }>({ homeDeptQueue: [], crossDeptQueue: [] });

  const [actioned, setActioned] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [toast, setToast] = useState<{ msg: string; type: 'approve' | 'reject' } | null>(null);

  useEffect(() => {
    if (!isDeptHead && !isLeader) {
      router.replace('/');
    }
  }, [isDeptHead, isLeader, router]);

  const loadData = useCallback(async () => {
    try {
      const [q, depts, allUsers] = await Promise.all([
        submissionService.getPendingQueuesForDeptHead(currentUser.deptId as DeptId),
        departmentService.getAllDepartments(),
        userService.getAllUsers(),
      ]);
      setQueues(q);
      setDepartments(depts);
      setUsers(allUsers);
    } catch (err: unknown) {
      logger.error('[DeptHeadPanelPage] Failed to load queues:', err);
    }
  }, [currentUser.deptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const currentDept = deptMap.get(currentUser.deptId);

  const showToast = (msg: string, type: 'approve' | 'reject') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await submissionService.approveSubmission(id, currentUser.id);
        setActioned((prev) => ({ ...prev, [id]: 'approved' }));
        showToast('Submission approved ✓', 'approve');
      } catch (err: any) {
        showToast(err.message || 'Failed to approve', 'reject');
      }
    },
    [currentUser.id]
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        await submissionService.rejectSubmission(id, currentUser.id);
        setActioned((prev) => ({ ...prev, [id]: 'rejected' }));
        showToast('Submission rejected', 'reject');
      } catch (err: any) {
        showToast(err.message || 'Failed to reject', 'reject');
      }
    },
    [currentUser.id]
  );

  if (!isDeptHead && !isLeader) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
          Access Restricted
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          This panel is only accessible to Department Heads and Leadership.
        </p>
      </div>
    );
  }

  const homePending = queues.homeDeptQueue.filter((s) => !actioned[s.id]).length;
  const crossPending = queues.crossDeptQueue.filter((s) => !actioned[s.id]).length;
  const totalPending = homePending + crossPending;

  return (
    <div
      style={{
        maxWidth: 1100,
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
            background: toast.type === 'approve' ? 'var(--status-approved-bg)' : 'var(--status-rejected-bg)',
            border: `1px solid ${toast.type === 'approve' ? 'var(--status-approved-border)' : 'var(--status-rejected-border)'}`,
            fontSize: '0.85rem',
            fontWeight: 700,
            color: toast.type === 'approve' ? 'var(--status-approved-text)' : 'var(--status-rejected-text)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-indigo)',
                background: 'var(--accent-indigo-subtle)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 6,
                padding: '2px 8px',
              }}
            >
              Dept Head Panel
            </span>
          </div>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
            }}
          >
            {currentDept?.name ?? 'Department'} — Approval Queue
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {currentUser.name} · Review and action pending contribution submissions
          </p>
        </div>

        {/* Total pending count */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              background: totalPending > 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-muted)',
              border: `1.5px solid ${totalPending > 0 ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'}`,
              borderRadius: 14,
              padding: '10px 20px',
            }}
          >
            <span
              style={{
                fontSize: '2.2rem',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                color: totalPending > 0 ? 'var(--accent-amber)' : 'var(--text-muted)',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {totalPending}
            </span>
            <p
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              total pending
            </p>
          </div>
        </div>
      </div>

      {/* Two columns of queues */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <QueueSection
          title="Home Dept Submissions"
          subtitle={`Contributions logged by members of ${currentDept?.name ?? 'your department'}`}
          accentColor="#10b981"
          queue={queues.homeDeptQueue}
          isCrossIncoming={false}
          actionedMap={actioned}
          onApprove={handleApprove}
          onReject={handleReject}
          userMap={userMap}
          deptMap={deptMap}
        />
        <QueueSection
          title="Incoming Cross-Dept Submissions"
          subtitle={`Members from other departments who helped ${currentDept?.shortName ?? 'your dept'}`}
          accentColor="#6366f1"
          queue={queues.crossDeptQueue}
          isCrossIncoming={true}
          actionedMap={actioned}
          onApprove={handleApprove}
          onReject={handleReject}
          userMap={userMap}
          deptMap={deptMap}
        />
      </div>

      {/* History */}
      <HistorySection
        deptId={currentUser.deptId as DeptId}
        deptName={currentDept?.name ?? ''}
        deptColor={currentDept?.color ?? '#6366f1'}
        userMap={userMap}
      />
    </div>
  );
}
