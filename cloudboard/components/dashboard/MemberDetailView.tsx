'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@/lib/services/types';
import { userService } from '@/lib/services';
import ProfileCard from '@/components/dashboard/ProfileCard';
import PointsBreakdown from '@/components/dashboard/PointsBreakdown';
import MemberSubmissionsView from '@/components/dashboard/MemberSubmissionsView';
import { SkeletonBox } from '@/components/ui/Skeleton';

interface MemberDetailViewProps {
  initialUser?: User | null;
  userId: string;
}

export default function MemberDetailView({
  initialUser,
  userId,
}: MemberDetailViewProps) {
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [loading, setLoading] = useState<boolean>(!initialUser);

  useEffect(() => {
    let isMounted = true;
    async function fetchUser() {
      try {
        const fetched = await userService.getUserById(userId);
        if (isMounted) {
          if (fetched) {
            setUser(fetched);
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    if (!user || user.id !== userId) {
      fetchUser();
    }
    return () => {
      isMounted = false;
    };
  }, [userId, user]);

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px 64px',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <SkeletonBox width="160px" height="20px" borderRadius="6px" />
        </div>
        <div className="cb-grid-2col">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SkeletonBox width="100%" height="340px" borderRadius="16px" />
            <SkeletonBox width="100%" height="240px" borderRadius="16px" />
          </div>
          <SkeletonBox width="100%" height="600px" borderRadius="16px" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: '80px auto',
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
        <h1
          style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: 8,
          }}
        >
          Member Not Found
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 24 }}>
          The requested member profile could not be located or may have been removed.
        </p>
        <Link href="/departments" className="cb-btn-primary">
          ← Return to Departments
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}
    >
      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/departments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--accent-green)',
            textDecoration: 'none',
          }}
        >
          ← Back to Departments
        </Link>
      </div>

      {/* Grid layout */}
      <div className="cb-grid-2col">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ProfileCard user={user} />
          <PointsBreakdown user={user} />
        </div>

        {/* Right column */}
        <MemberSubmissionsView userId={user.id} />
      </div>
    </div>
  );
}
