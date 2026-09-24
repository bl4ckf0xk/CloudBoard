'use client';

import React, { useState } from 'react';
import { useRole } from '@/lib/roleContext';

type AuthView = 'signin' | 'forgot' | 'new_password_required' | 'guide';

export default function LoginScreen() {
  const {
    signIn,
    forgotPassword,
    confirmForgotPassword,
    completeNewPasswordChallenge,
  } = useRole();

  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Forgot password flow states
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [codeDestination, setCodeDestination] = useState<string | null>(null);

  // Challenge session state
  const [challengeSession, setChallengeSession] = useState<string | null>(null);

  // ─── Sign In Handler ──────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await signIn(email, password);
      if (result.challengeName === 'NEW_PASSWORD_REQUIRED' && result.session) {
        setChallengeSession(result.session);
        setView('new_password_required');
        setError(null);
      } else {
        setSuccess('Authentication successful! Loading CloudBoard...');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Forgot Password Step 1: Send Code ────────────────────────
  async function handleSendResetCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await forgotPassword(email);
      const dest = res.codeDeliveryDetails?.Destination || 'your email';
      setCodeDestination(dest);
      setSuccess(`Verification code sent to ${dest}.`);
      setResetStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset code. Please check your email address.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Forgot Password Step 2: Confirm Reset ────────────────────
  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmationCode || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await confirmForgotPassword(email, confirmationCode, newPassword);
      setSuccess('Password reset successfully! You can now sign in with your new password.');
      setTimeout(() => {
        setView('signin');
        setResetStep(1);
        setConfirmationCode('');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password. Please check the code and try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Handle New Password Required Challenge ───────────────────
  async function handleCompleteNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      setError('Please provide a new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!challengeSession) {
      setError('Session expired. Please try signing in again.');
      setView('signin');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await completeNewPasswordChallenge(email, newPassword, challengeSession);
      setSuccess('Permanent password updated successfully! Entering CloudBoard...');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set new password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at top, #091e14 0%, #030712 60%, #02040a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        zIndex: 9999,
        overflowY: 'auto',
        color: '#f8fafc',
      }}
    >
      {/* Background glowing ambient orbs */}
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 550,
          height: 400,
          background: 'radial-gradient(circle, rgba(22, 163, 74, 0.18) 0%, rgba(22, 163, 74, 0) 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '10%',
          right: '20%',
          width: 350,
          height: 350,
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Container Card */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(22, 163, 74, 0.2)',
          position: 'relative',
          zIndex: 1,
          margin: 'auto 0',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.4)',
              fontSize: '1.6rem',
              color: '#ffffff',
              marginBottom: 14,
              border: '1.5px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            ☁
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              margin: 0,
            }}
          >
            Cloud<span style={{ color: '#22c55e' }}>Board</span>
          </h1>

          <p
            style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              marginTop: 6,
              marginBottom: 0,
              fontWeight: 500,
            }}
          >
            AWS Student Builder Group · Internal Performance Platform
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              padding: '3px 10px',
              borderRadius: 20,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              fontSize: '0.7rem',
              color: '#4ade80',
              fontWeight: 600,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            AWS Cognito Protected Portal
          </div>
        </div>

        {/* Global Feedback Banners */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.82rem',
              marginBottom: 18,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#86efac',
              fontSize: '0.82rem',
              marginBottom: 18,
              lineHeight: 1.4,
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            ✓ {success}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            VIEW 1: SIGN IN
           ═════════════════════════════════════════════════════════════ */}
        {view === 'signin' && (
          <>
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: 6,
                  }}
                >
                  AWS Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@domain.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
                />
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <label
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                    }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot');
                      setError(null);
                      setSuccess(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4ade80',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 42px 11px 14px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      padding: 0,
                    }}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || Boolean(success)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 6,
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-sm" /> Authenticating...
                  </>
                ) : (
                  <>
                    <span>🔐</span> Sign In with Cognito
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: 20,
                textAlign: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setView('guide')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Need Help Signing In? View Reset Guide ℹ
              </button>
            </div>
          </>
        )}

        {/* ═════════════════════════════════════════════════════════════
            VIEW 2: FORGOT / RESET PASSWORD
           ═════════════════════════════════════════════════════════════ */}
        {view === 'forgot' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 4px',
                }}
              >
                Reset Account Password
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                {resetStep === 1
                  ? 'Enter your registered email to receive a password reset verification code.'
                  : `Enter the code sent to ${codeDestination || email} and choose a new password.`}
              </p>
            </div>

            {resetStep === 1 ? (
              <form onSubmit={handleSendResetCode} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      marginBottom: 6,
                    }}
                  >
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. yourname@domain.com"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    marginTop: 4,
                  }}
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      marginBottom: 6,
                    }}
                  >
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="e.g. 123456"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '1rem',
                      letterSpacing: '0.15em',
                      fontWeight: 700,
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: '#cbd5e1',
                      marginBottom: 6,
                    }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
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
                      color: '#cbd5e1',
                      marginBottom: 6,
                    }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    marginTop: 4,
                  }}
                >
                  {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                onClick={() => {
                  setView('signin');
                  setError(null);
                  setSuccess(null);
                  setResetStep(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ← Back to Sign In
              </button>

              <button
                type="button"
                onClick={() => setView('guide')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                AWS Admin Reset Guide ℹ
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            VIEW 3: NEW PASSWORD REQUIRED (CHALLENGE)
           ═════════════════════════════════════════════════════════════ */}
        {view === 'new_password_required' && (
          <div>
            <div style={{ marginBottom: 18 }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 4px',
                }}
              >
                Set Permanent Password
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                This is your first login with a temporary password. Please set a secure permanent password to continue.
              </p>
            </div>

            <form onSubmit={handleCompleteNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    marginBottom: 6,
                  }}
                >
                  New Permanent Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
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
                    color: '#cbd5e1',
                    marginBottom: 6,
                  }}
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat permanent password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {loading ? 'Updating Password...' : 'Save & Enter CloudBoard'}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setView('signin');
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Cancel and return to Sign In
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════
            VIEW 4: ADMIN PASSWORD RESET GUIDE
           ═════════════════════════════════════════════════════════════ */}
        {view === 'guide' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 4px',
                }}
              >
                AWS Cognito Password Reset Guide
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                Instructions for Admins & Users to manage Cognito credentials.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                fontSize: '0.78rem',
                color: '#cbd5e1',
                maxHeight: 280,
                overflowY: 'auto',
                paddingRight: 6,
              }}
            >
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>
                  Option A: Self-Service Reset (In App)
                </div>
                <div>
                  Click &quot;Forgot Password?&quot; on the sign-in tab. Enter your registered email to receive a 6-digit code via email, then enter the code with your new password.
                </div>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                  Option B: AWS Console (Admin)
                </div>
                <ol style={{ paddingLeft: 18, margin: 0, lineHeight: 1.5 }}>
                  <li>Open <strong>AWS Cognito Console</strong> in <code>{process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1'}</code></li>
                  <li>Select User Pool: <code>{process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'ap-south-1_xxxxxxxxx'}</code></li>
                  <li>Click on <strong>Users</strong> tab and click the user&apos;s email</li>
                  <li>Click <strong>Actions → Reset password</strong> or <strong>Set permanent password</strong></li>
                </ol>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
                  Option C: AWS CLI Command (Admin)
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: '#020617', padding: '8px', borderRadius: 6, color: '#93c5fd', wordBreak: 'break-all' }}>
                  aws cognito-idp admin-set-user-password \<br/>
                  &nbsp;&nbsp;--user-pool-id {process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'ap-south-1_xxxxxxxxx'} \<br/>
                  &nbsp;&nbsp;--username &lt;user-email&gt; \<br/>
                  &nbsp;&nbsp;--password &lt;new-password&gt; \<br/>
                  &nbsp;&nbsp;--permanent
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setView('signin')}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 14,
              }}
            >
              ← Back to Sign In
            </button>
          </div>
        )}
      </div>

      {/* Footer subtle text */}
      <div
        style={{
          marginTop: 20,
          fontSize: '0.72rem',
          color: '#64748b',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        CloudBoard v1.0 · AWS Student Builder Group — Informatics Institute of Technology
      </div>
    </div>
  );
}
