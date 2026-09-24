'use client';

import React, { useState, useEffect } from 'react';
import { useRole } from '@/lib/roleContext';
import { Department } from '@/lib/services/types';
import { departmentService } from '@/lib/services';
import ProfileCard from '@/components/dashboard/ProfileCard';
import PointsTimeline from '@/components/dashboard/PointsTimeline';
import PointsBreakdown from '@/components/dashboard/PointsBreakdown';
import CoreTeamLeaderboard from '@/components/dashboard/CoreTeamLeaderboard';
import { getBadgeColors } from '@/lib/utils';
import { ShieldCheck, Lock } from 'lucide-react';

function AccessBanner({ dept }: { dept?: Department | null }) {
  const { currentUser } = useRole();
  const bc = getBadgeColors(currentUser?.role);

  const notes: Record<string, { title: string; body: string; icon: string }> = {
    volunteer: {
      icon: '👥',
      title: 'Volunteer View',
      body: `You can see your own recognition history, department points, and mark your event attendance in the Attendance module.`,
    },
    committee: {
      icon: '⭐',
      title: 'Committee View',
      body: `You have access to committee leaderboard insights, can submit recognition for peers, and mark your own event attendance.`,
    },
    'dept-head': {
      icon: '🏛',
      title: 'Department Head View',
      body: `You have full visibility of ${dept?.name ?? 'Department'}'s activity, submission approvals, and department-wide attendance management.`,
    },
    leader: {
      icon: '🌐',
      title: 'Leader View',
      body: 'You have organisation-wide visibility across all departments, member points, approvals, and attendance management.',
    },
  };

  const note = notes[currentUser.role] ?? notes.volunteer;

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderColor: bc.border,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: bc.bg,
          border: `1.5px solid ${bc.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          flexShrink: 0,
        }}
      >
        {note.icon}
      </div>
      <div>
        <p
          style={{
            fontSize: '0.86rem',
            fontWeight: 700,
            color: bc.text,
            marginBottom: 2,
          }}
        >
          {note.title}
        </p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {note.body}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { currentUser, isVolunteer } = useRole();
  const [dept, setDept] = useState<Department | null>(null);

  useEffect(() => {
    departmentService.getDepartmentById(currentUser.deptId).then(setDept);
  }, [currentUser.deptId]);

  return (
    <div
      style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Access note */}
      <AccessBanner dept={dept} />

      {/* Quick stats & action banner */}
      <div
        className="glass-card animate-fade-in-up"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%)',
          borderRadius: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 2 }}>
            Welcome back, {currentUser.name}! 👋
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Track your verified points, review milestones, and monitor committee standings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-log-modal'));
            }}
            className="cb-btn-primary"
            style={{ fontSize: '0.84rem', padding: '9px 18px' }}
          >
            + Award Points
          </button>
        </div>
      </div>

      {/* ── Primary layout: 2-col on desktop ── */}
      <div className="cb-grid-dashboard">
        {/* ── LEFT COLUMN: Profile + Breakdown ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Profile Card */}
          <ProfileCard user={currentUser} />

          {/* Points Breakdown */}
          <PointsBreakdown user={currentUser} />

          {/* Committee Leaderboard — only if role >= committee */}
          {!isVolunteer && <CoreTeamLeaderboard currentUser={currentUser} />}
        </div>

        {/* ── RIGHT COLUMN: Timeline ── */}
        <div>
          <PointsTimeline user={currentUser} />
        </div>
      </div>

      {/* Volunteer-only: simplified note instead of leaderboard */}
      {isVolunteer && (
        <div
          className="animate-fade-in-up"
          style={{
            marginTop: 8,
            padding: '14px 20px',
            borderRadius: 12,
            background: 'var(--bg-muted)',
            border: '1px dashed var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Lock size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            The Committee Leaderboard is visible to Committee members and above.
            Your personal recognition stats are shown in the cards above.
          </p>
        </div>
      )}
    </div>
  );
}
