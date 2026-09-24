'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '32px 24px',
      }}
    >
      <div
        className="animate-fade-in-up"
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(99, 102, 241, 0.08))',
          border: '1.5px solid rgba(79, 70, 229, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.4rem',
          marginBottom: 20,
          boxShadow: '0 8px 32px rgba(79, 70, 229, 0.2)',
          color: 'var(--accent-indigo)',
        }}
      >
        ☁️
      </div>

      <h1
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.04em',
          marginBottom: 8,
        }}
      >
        404 — Page Not Found
      </h1>

      <p
        style={{
          fontSize: '0.9rem',
          color: 'var(--text-muted)',
          maxWidth: 420,
          marginBottom: 28,
          lineHeight: 1.6,
        }}
      >
        Oops! The page you are looking for doesn&apos;t exist or may have moved within CloudBoard.
      </p>

      <Link href="/" className="cb-btn-primary">
        <ArrowLeft size={16} />
        <span>Back to Overview</span>
      </Link>
    </div>
  );
}
