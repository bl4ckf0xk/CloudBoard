'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRole } from '@/lib/roleContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signIn } = useRole();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-card, #0f172a)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          borderRadius: 16,
          padding: '28px 24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(22, 163, 74, 0.15)',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              margin: '0 auto 12px',
            }}
          >
            🔐
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            AWS Cognito Sign In
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Authenticate with your registered AWS Student Builder Group account
          </p>
        </div>

        {/* Feedback messages */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.35)',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(22, 163, 74, 0.15)',
              border: '1px solid rgba(22, 163, 74, 0.35)',
              color: '#4ade80',
              fontSize: '0.8rem',
              marginBottom: 16,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            ✓ Authenticated successfully! Connecting live backend...
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@domain.com"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 6,
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In with Cognito'}
          </button>
        </form>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.2rem',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
