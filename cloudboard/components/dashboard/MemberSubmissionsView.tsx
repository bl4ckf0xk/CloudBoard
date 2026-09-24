'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { PointSubmission, User } from '@/lib/services/types';
import { submissionService, userService } from '@/lib/services';
import { relativeTime } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';

interface MemberSubmissionsViewProps {
  userId: string;
}

export default function MemberSubmissionsView({ userId }: MemberSubmissionsViewProps) {
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [subs, allUsers] = await Promise.all([
          submissionService.getSubmissionsForUser(userId),
          userService.getAllUsers(),
        ]);
        if (isMounted) {
          setSubmissions(subs);
          setUsers(allUsers);
        }
      } catch (err) {
        console.error('[MemberSubmissionsView] Failed to load submissions', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const receivedSubs = useMemo(
    () => submissions.filter((s) => s.targetUserId === userId),
    [submissions, userId]
  );

  const givenSubs = useMemo(
    () => submissions.filter((s) => s.submitterId === userId),
    [submissions, userId]
  );

  const getSubUserName = (id: string) => {
    const u = userMap.get(id);
    return u?.name ?? 'Teammate';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Submissions received */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
          🏆 Recognition Received ({receivedSubs.length})
        </h2>
        {receivedSubs.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="No recognition received yet"
            description="When team members recognise contributions, points and notes will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {receivedSubs.map((sub) => {
              const submitterName = getSubUserName(sub.submitterId);
              return (
                <div
                  key={sub.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      +{sub.points} pts from {submitterName}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {relativeTime(sub.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {sub.reason}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submissions given */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-primary)' }}>
          🤝 Peer Recognition Given ({givenSubs.length})
        </h2>
        {givenSubs.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="No recognition submitted yet"
            description="Use the Log Contribution button to recognize teammates and celebrate their milestones."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {givenSubs.map((sub) => {
              const recipientName = getSubUserName(sub.targetUserId);
              return (
                <div
                  key={sub.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Given to {recipientName} (+{sub.points} pts)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {relativeTime(sub.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {sub.reason}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
