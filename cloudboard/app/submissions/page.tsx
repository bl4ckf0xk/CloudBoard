'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PointSubmission, Department, User, DeptId } from '@/lib/services/types';
import { submissionService, departmentService, userService } from '@/lib/services';
import { formatDate, relativeTime, CATEGORY_META } from '@/lib/utils';
import { logger } from '@/lib/logger';
import EmptyState from '@/components/ui/EmptyState';
import { Filter, CheckCircle2, Sparkles } from 'lucide-react';

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [deptFilter, setDeptFilter] = useState<DeptId | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [subs, depts, allUsers] = await Promise.all([
          submissionService.getSubmissions({ status: 'approved' }),
          departmentService.getAllDepartments(),
          userService.getAllUsers(),
        ]);
        if (isMounted) {
          setSubmissions(subs);
          setDepartments(depts);
          setUsers(allUsers);
        }
      } catch (err: unknown) {
        logger.error('[SubmissionsPage] Failed to load data:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);

  const filteredSubmissions = useMemo(() => {
    let list = [...submissions];
    if (deptFilter !== 'all') {
      list = list.filter(
        (s) => s.target_dept === deptFilter || s.home_dept === deptFilter
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter((s) => s.category === categoryFilter);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [submissions, deptFilter, categoryFilter]);

  const totalPoints = useMemo(
    () => filteredSubmissions.reduce((acc, s) => acc + s.points, 0),
    [filteredSubmissions]
  );

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* Header and Filter Row */}
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
            Public Recognition Feed
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
            A live ledger of recognized contributions and cross-department achievements
          </p>
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600 }}>
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value as DeptId | 'all')}
            className="custom-select"
            style={{ width: 'auto', padding: '7px 32px 7px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.shortName}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="custom-select"
            style={{ width: 'auto', padding: '7px 32px 7px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">All Categories</option>
            {Object.keys(CATEGORY_META).map((k) => (
              <option key={k} value={k}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--accent-green)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{filteredSubmissions.length} approved recognitions</span>
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'var(--accent-amber)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={16} />
          <span>{totalPoints.toLocaleString()} points awarded</span>
        </div>
      </div>

      {/* Feed List */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredSubmissions.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No matching submissions found"
            description="Try changing the department or category filters above."
          />
        ) : (
          filteredSubmissions.map((sub, idx) => {
            const submitter = userMap.get(sub.submitterId);
            const recipient = userMap.get(sub.targetUserId);
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
                key={sub.id}
                className={`animate-fade-in-up stagger-${(idx % 5) + 1}`}
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  transition: 'background 0.2s ease',
                }}
              >
                {/* Category icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: catMeta.bg,
                    border: `1.5px solid ${catMeta.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  {catMeta.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      {submitter?.name ?? '—'}
                    </strong>{' '}
                    recognized{' '}
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      {recipient?.name ?? '—'}
                    </strong>
                    {sub.cross_dept && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: 'var(--accent-indigo)',
                          background: 'var(--accent-indigo-subtle)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          borderRadius: 6,
                          padding: '2px 8px',
                          verticalAlign: 'middle',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        🔗 Cross-Dept
                      </span>
                    )}
                  </div>

                  {/* Reason Box */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-muted)',
                      borderRadius: 10,
                      borderLeft: `3.5px solid ${catMeta.color}`,
                      marginBottom: 10,
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                      }}
                    >
                      &ldquo;{sub.reason}&rdquo;
                    </p>
                  </div>

                  {/* Meta Strip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        color: catMeta.color,
                        background: catMeta.bg,
                        border: `1px solid ${catMeta.border}`,
                        borderRadius: 6,
                        padding: '2px 8px',
                      }}
                    >
                      {sub.category}
                    </span>
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--border-subtle)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {targetDept?.icon} {targetDept?.shortName}
                    </span>
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'var(--border-subtle)',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}
                      title={formatDate(sub.createdAt)}
                    >
                      {relativeTime(sub.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Points Tier Badge */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span className={`tier-badge ${tierClass}`} style={{ fontSize: '0.84rem', padding: '6px 12px' }}>
                    +{sub.points} pts
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
