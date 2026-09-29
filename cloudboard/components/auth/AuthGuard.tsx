'use client';

import React from 'react';
import { useRole } from '@/lib/roleContext';
import LoginScreen from '@/components/auth/LoginScreen';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoadingAuth } = useRole();
  const isDemoMode = process.env.NEXT_PUBLIC_DATA_SOURCE !== 'aws';

  // Show loading splash while validating cached tokens (AWS mode only)
  if (!isDemoMode && isLoadingAuth) {
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
          gap: 16,
          color: '#ffffff',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            boxShadow: '0 0 30px rgba(22, 163, 74, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            animation: 'pulse 2s infinite ease-in-out',
          }}
        >
          ⚡
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '-0.01em' }}>
          Verifying AWS Cognito Session...
        </div>
      </div>
    );
  }

  // If not logged in and not in demo mode, show the Login Screen
  if (!isDemoMode && !isAuthenticated) {
    return <LoginScreen />;
  }

  // Once authenticated or in demo mode, render full application
  return <>{children}</>;
}
