'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '52px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--accent-indigo-subtle)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          marginBottom: 16,
          color: 'var(--accent-indigo)',
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: '1.02rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 6,
          letterSpacing: '-0.02em',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '0.84rem',
          color: 'var(--text-muted)',
          maxWidth: 340,
          lineHeight: 1.5,
          marginBottom: action ? 20 : 0,
        }}
      >
        {description}
      </p>
      {action && (
        <button onClick={action.onClick} className="cb-btn-primary" style={{ marginTop: 14 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
