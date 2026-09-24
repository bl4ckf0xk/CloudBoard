'use client';

import React from 'react';
import { SkeletonBox } from '@/components/ui/Skeleton';

export default function Loading() {
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
      {/* Header skeleton */}
      <div>
        <SkeletonBox width="220px" height="28px" borderRadius="8px" style={{ marginBottom: 10 }} />
        <SkeletonBox width="340px" height="16px" borderRadius="6px" />
      </div>

      {/* Grid skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              height: 140,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <SkeletonBox width="110px" height="14px" borderRadius="4px" />
            <SkeletonBox width="150px" height="36px" borderRadius="8px" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="cb-grid-2col">
        <div className="glass-card" style={{ height: 320, padding: 24 }}>
          <SkeletonBox width="180px" height="20px" borderRadius="6px" style={{ marginBottom: 20 }} />
          <SkeletonBox width="100%" height="220px" borderRadius="10px" />
        </div>
        <div className="glass-card" style={{ height: 320, padding: 24 }}>
          <SkeletonBox width="140px" height="20px" borderRadius="6px" style={{ marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4].map((j) => (
              <SkeletonBox key={j} width="100%" height="44px" borderRadius="8px" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
