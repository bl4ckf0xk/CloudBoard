'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: '65vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1.5px solid rgba(239, 68, 68, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          marginBottom: 18,
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
        }}
      >
        <AlertTriangle size={36} />
      </div>

      <h2
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}
      >
        Something went wrong
      </h2>

      <p
        style={{
          fontSize: '0.88rem',
          color: 'var(--text-muted)',
          maxWidth: 420,
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        {error.message || 'An unexpected error occurred while rendering this page.'}
      </p>

      <button onClick={() => reset()} className="cb-btn-primary">
        <RotateCcw size={16} />
        <span>Try Again</span>
      </button>
    </div>
  );
}
