'use client';

import React from 'react';

export function SkeletonBox({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  style,
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton-box"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <SkeletonBox width="40%" height="14px" style={{ marginBottom: 16 }} />
      <SkeletonBox width="70%" height="32px" style={{ marginBottom: 12 }} />
      <SkeletonBox width="90%" height="16px" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="cb-table-wrapper">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBox key={i} width="100%" height="40px" />
        ))}
      </div>
    </div>
  );
}
