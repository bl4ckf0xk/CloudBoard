'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { User, Department, PointSubmission } from '@/lib/services/types';
import { submissionService, departmentService } from '@/lib/services';
import { isUserMatch } from '@/lib/utils';

interface BreakdownData {
  homePts: number;
  crossPts: number;
  total: number;
  homePercent: number;
  crossPercent: number;
  categoryBreakdown: Record<string, number>;
}

const CAT_COLORS: Record<string, string> = {
  collaboration: '#16a34a',
  innovation: '#15803d',
  leadership: '#ca8a04',
  delivery: '#059669',
  culture: '#dc2626',
};

const CAT_ICONS: Record<string, string> = {
  collaboration: '🤝',
  innovation: '💡',
  leadership: '⭐',
  delivery: '🚀',
  culture: '🌟',
};

function SegmentBar({
  homePercent,
  crossPercent,
  deptColor,
}: {
  homePercent: number;
  crossPercent: number;
  deptColor: string;
}) {
  return (
    <div
      style={{
        height: 10,
        borderRadius: 5,
        background: 'var(--bg-muted)',
        overflow: 'hidden',
        display: 'flex',
        position: 'relative',
      }}
    >
      {/* Home dept segment */}
      <div
        style={{
          width: `${homePercent}%`,
          background: `linear-gradient(90deg, ${deptColor}, ${deptColor}88)`,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '5px 0 0 5px',
        }}
      />
      {/* Cross-dept segment */}
      <div
        style={{
          width: `${crossPercent}%`,
          background: `linear-gradient(90deg, #818cf8, #6366f1)`,
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          transitionDelay: '0.1s',
        }}
      />
    </div>
  );
}

function DonutChart({
  homePts,
  crossPts,
  deptColor,
}: {
  homePts: number;
  crossPts: number;
  deptColor: string;
}) {
  const total = homePts + crossPts;
  if (total === 0) return null;

  const radius = 44;
  const stroke = 10;
  const cx = 54;
  const cy = 54;
  const circumference = 2 * Math.PI * radius;

  const homeFrac = homePts / total;
  const crossFrac = crossPts / total;

  const homeDash = circumference * homeFrac;
  const crossDash = circumference * crossFrac;

  return (
    <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
      <svg width={108} height={108} viewBox="0 0 108 108" style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        {/* Home segment */}
        {homePts > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={deptColor}
            strokeWidth={stroke}
            strokeDasharray={`${homeDash} ${circumference - homeDash}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        )}
        {/* Cross-dept segment */}
        {crossPts > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#6366f1"
            strokeWidth={stroke}
            strokeDasharray={`${crossDash} ${circumference - crossDash}`}
            strokeDashoffset={circumference / 4 - homeDash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)', transitionDelay: '0.2s' }}
          />
        )}
      </svg>
      {/* Centre text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          {total}
        </span>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
          pts
        </span>
      </div>
    </div>
  );
}

interface PointsBreakdownProps {
  user: User;
}

export default function PointsBreakdown({ user }: PointsBreakdownProps) {
  const [dept, setDept] = useState<Department | null>(null);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [d, subs] = await Promise.all([
          departmentService.getDepartmentById(user.deptId),
          submissionService.getSubmissionsForUser(user.id),
        ]);
        if (isMounted) {
          if (d) setDept(d);
          if (subs) setSubmissions(subs);
        }
      } catch (err) {
        console.error('[PointsBreakdown] Failed to load data', err);
      }
    }
    loadData();

    const handleReload = () => loadData();
    window.addEventListener('contribution-submitted', handleReload);
    return () => {
      isMounted = false;
      window.removeEventListener('contribution-submitted', handleReload);
    };
  }, [user.id, user.deptId]);

  const data: BreakdownData = useMemo(() => {
    const approved = submissions.filter(
      (s) => isUserMatch(s.targetUserId, user) && s.status === 'approved'
    );

    const homePts = approved
      .filter((s) => !s.cross_dept)
      .reduce((a, s) => a + s.points, 0);

    const crossPts = approved
      .filter((s) => s.cross_dept)
      .reduce((a, s) => a + s.points, 0);

    const total = homePts + crossPts;

    const categoryBreakdown: Record<string, number> = {};
    approved.forEach((s) => {
      categoryBreakdown[s.category] = (categoryBreakdown[s.category] ?? 0) + s.points;
    });

    return {
      homePts,
      crossPts,
      total,
      homePercent: total > 0 ? (homePts / total) * 100 : 0,
      crossPercent: total > 0 ? (crossPts / total) * 100 : 0,
      categoryBreakdown,
    };
  }, [submissions, user.id]);

  const deptColor = dept?.color ?? '#16a34a';

  const sortedCats = Object.entries(data.categoryBreakdown).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{ padding: '20px 20px 24px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3
          style={{
            fontSize: '0.92rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 2,
          }}
        >
          Points Breakdown
        </h3>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Home dept vs. cross-department points
        </p>
      </div>

      {data.total === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>📊</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No confirmed points yet
          </p>
        </div>
      ) : (
        <>
          {/* Donut + legend row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              marginBottom: 20,
            }}
          >
            <DonutChart
              homePts={data.homePts}
              crossPts={data.crossPts}
              deptColor={deptColor}
            />

            <div style={{ flex: 1 }}>
              {/* Home dept */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: deptColor,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {dept?.shortName ?? 'Home'} (Home)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: deptColor,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {data.homePts} pts
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 3,
                    background: 'var(--bg-muted)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${data.homePercent}%`,
                      background: `linear-gradient(90deg, ${deptColor}, ${deptColor}88)`,
                      borderRadius: 3,
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  />
                </div>
              </div>

              {/* Cross-dept */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: '#6366f1',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      Cross-Department
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#818cf8',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {data.crossPts} pts
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 3,
                    background: 'var(--bg-muted)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${data.crossPercent}%`,
                      background: 'linear-gradient(90deg, #6366f1, #818cf888)',
                      borderRadius: 3,
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                      transitionDelay: '0.15s',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Combined segmented bar */}
          <div style={{ marginBottom: 20 }}>
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 6,
              }}
            >
              Distribution
            </p>
            <SegmentBar
              homePercent={data.homePercent}
              crossPercent={data.crossPercent}
              deptColor={deptColor}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {Math.round(data.homePercent)}% Home
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {Math.round(data.crossPercent)}% Cross
              </span>
            </div>
          </div>

          {/* Category breakdown */}
          {sortedCats.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: 10,
                }}
              >
                By Category
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sortedCats.map(([cat, pts]) => {
                  const catColor = CAT_COLORS[cat] ?? '#16a34a';
                  const pct = data.total > 0 ? (pts / data.total) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            textTransform: 'capitalize',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem' }}>{CAT_ICONS[cat] ?? '◉'}</span>
                          {cat}
                        </span>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: catColor,
                          }}
                        >
                          {pts}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: 'var(--bg-muted)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: catColor,
                            borderRadius: 2,
                            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
