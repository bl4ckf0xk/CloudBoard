'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { User, Department, PointSubmission } from '@/lib/services/types';
import { userService, submissionService, departmentService } from '@/lib/services';
import { ROLE_RANK, getBadgeColors, getRoleMeta, isUserMatch } from '@/lib/utils';
import { useRole } from '@/lib/roleContext';
import { Camera, Trash2, Shield, Award, Sparkles, TrendingUp, CheckCircle2, Clock } from 'lucide-react';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local.charAt(0)}*@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

interface ProfileCardProps {
  user: User;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  const { currentUser, isLeader, isDeptHead, isCommittee, updateUserAvatar } = useRole();
  const [activeUser, setActiveUser] = useState<User>(user);
  const [dept, setDept] = useState<Department | null>(null);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [freshUser, freshDept, freshSubs] = await Promise.all([
          userService.getUserById(user.id),
          departmentService.getDepartmentById(user.deptId),
          submissionService.getSubmissionsForUser(user.id),
        ]);
        if (isMounted) {
          if (freshUser) setActiveUser(freshUser);
          if (freshDept) setDept(freshDept);
          if (freshSubs) setSubmissions(freshSubs);
        }
      } catch (err) {
        console.error('[ProfileCard] Failed to load data', err);
      }
    }
    loadData();

    const handleReload = () => loadData();
    window.addEventListener('contribution-submitted', handleReload);
    return () => {
      isMounted = false;
      window.removeEventListener('contribution-submitted', handleReload);
    };
  }, [user.id, user.deptId]);

  // Sync activeUser with currentUser if it is the current user
  useEffect(() => {
    if (currentUser && currentUser.id === activeUser.id) {
      setActiveUser((prev) => ({
        ...prev,
        ...currentUser,
        avatarUrl: currentUser.avatarUrl ?? prev.avatarUrl,
      }));
    }
  }, [currentUser, activeUser.id]);

  const meta = getRoleMeta(activeUser?.role);
  const bc = getBadgeColors(activeUser?.role);

  // Calculate confirmed points from submissions
  const confirmedPoints = useMemo(
    () =>
      submissions
        .filter((s) => isUserMatch(s.targetUserId, activeUser) && (s.status === 'approved' || (s.status as any) === 'confirmed'))
        .reduce((acc, s) => acc + (Number(s.points) || 0), 0),
    [submissions, activeUser]
  );

  const pendingPoints = useMemo(
    () =>
      submissions
        .filter((s) => isUserMatch(s.targetUserId, activeUser) && s.status === 'pending')
        .reduce((acc, s) => acc + (Number(s.points) || 0), 0),
    [submissions, activeUser]
  );

  // Robust lifetime points display (highest of stored or verified submission sum)
  const displayLifetimePoints = useMemo(() => {
    return Math.max(activeUser.totalPoints || 0, confirmedPoints);
  }, [activeUser.totalPoints, confirmedPoints]);

  const rankLabel =
    ROLE_RANK[activeUser.role] >= 2
      ? 'Executive Leadership'
      : ROLE_RANK[activeUser.role] === 1
      ? 'Core Committee'
      : 'Active Contributor';

  const canEditAvatar = currentUser?.id === activeUser?.id || isLeader;
  const canViewFullEmail = currentUser?.id === activeUser?.id || isLeader || isDeptHead || isCommittee;

  const joinYear = new Date(activeUser.joinDate).getFullYear();
  const joinMonth = new Date(activeUser.joinDate).toLocaleString('en-US', {
    month: 'short',
  });

  // ─── Secure Avatar Upload Handler ─────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // 1. Strict MIME type check for security
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid format. Please upload JPG, PNG, WEBP or GIF only.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Strict file size check (max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      setUploadError('File exceeds 2MB limit. Please choose a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);

    try {
      // 3. Client-side sanitization: read as Base64 Data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        if (!base64Data || !base64Data.startsWith('data:image/')) {
          setUploadError('Failed to process image safely.');
          setIsUploading(false);
          return;
        }

        try {
          if (currentUser.id === activeUser.id) {
            await updateUserAvatar(base64Data);
          } else {
            const updated = await userService.updateUserAvatar(activeUser.id, base64Data);
            setActiveUser(updated);
          }
          setActiveUser((prev) => ({ ...prev, avatarUrl: base64Data }));
          setUploadError(null);
        } catch (err: unknown) {
          console.error('[ProfileCard] Avatar update error:', err);
          setUploadError('Failed to update avatar photo. Please try again.');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        setUploadError('Error reading selected image.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch {
      setUploadError('Unexpected error uploading picture.');
      setIsUploading(false);
    }
  };

  // ─── Remove Avatar Handler ────────────────────────────────────
  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setUploadError(null);
    try {
      if (currentUser.id === activeUser.id) {
        await updateUserAvatar('');
      } else {
        const updated = await userService.updateUserAvatar(activeUser.id, '');
        setActiveUser(updated);
      }
      setActiveUser((prev) => ({ ...prev, avatarUrl: undefined }));
    } catch (err) {
      console.error('[ProfileCard] Remove avatar error:', err);
      setUploadError('Could not reset avatar.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="glass-card animate-fade-in-up"
      style={{
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 18,
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top Banner with dynamic gradient */}
      <div
        style={{
          height: 100,
          background: `linear-gradient(135deg, ${dept?.color ?? '#16a34a'}33 0%, ${bc.bg} 100%)`,
          borderBottom: '1px solid var(--border-subtle)',
          position: 'relative',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.85rem' }}>{dept?.icon ?? '⚡'}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: dept?.color ?? 'var(--text-primary)' }}>
            {dept?.shortName ?? 'CloudBoard'}
          </span>
        </div>

        {/* Role badge */}
        <span
          style={{
            background: bc.bg,
            color: bc.text,
            border: `1.5px solid ${bc.border}`,
            borderRadius: 8,
            padding: '4px 10px',
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Sparkles size={11} /> {meta.label}
        </span>
      </div>

      {/* Main Profile Info */}
      <div style={{ padding: '0 24px 24px' }}>
        {/* Avatar with Camera Trigger */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -42, marginBottom: 14 }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: `${activeUser.avatarColor}20`,
                border: `3px solid var(--bg-card)`,
                boxShadow: `0 0 0 3px ${activeUser.avatarColor}70, 0 6px 20px rgba(0,0,0,0.15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: activeUser.avatarColor,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {activeUser.avatarUrl ? (
                <img
                  src={activeUser.avatarUrl}
                  alt={activeUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                activeUser.avatarInitials
              )}
            </div>

            {/* Camera Overlay Icon */}
            {canEditAvatar && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Upload Profile Picture (Max 2MB, JPG/PNG/WEBP)"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: -4,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--accent-indigo)',
                  color: '#ffffff',
                  border: '2px solid var(--bg-card)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, background 0.2s',
                }}
              >
                <Camera size={14} />
              </button>
            )}

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* Remove avatar action if picture exists */}
          {canEditAvatar && activeUser.avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={isUploading}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: '0.68rem',
                color: 'var(--accent-red)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={11} /> Remove Photo
            </button>
          )}
        </div>

        {/* Upload error display */}
        {uploadError && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--status-rejected-bg)',
              border: '1px solid var(--status-rejected-border)',
              color: 'var(--status-rejected-text)',
              fontSize: '0.72rem',
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚠</span>
            <span>{uploadError}</span>
          </div>
        )}

        {/* User name & privacy-safe email */}
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            marginBottom: 4,
          }}
        >
          {activeUser.name}
        </h2>

        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{canViewFullEmail ? activeUser.email : maskEmail(activeUser.email)}</span>
          {!canViewFullEmail && activeUser.email && (
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-muted)',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
              title="Protected PII according to CloudBoard privacy policy"
            >
              <Shield size={10} /> Private
            </span>
          )}
        </p>

        {/* Department tag & standing */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {dept && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: `${dept.color}15`,
                border: `1.5px solid ${dept.color}35`,
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: dept.color,
              }}
            >
              <span>{dept.icon}</span>
              {dept.name}
            </span>
          )}
          <span
            style={{
              fontSize: '0.74rem',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Award size={13} style={{ color: 'var(--accent-amber)' }} />
            {rankLabel}
          </span>
        </div>

        {/* Points Summary Section */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1.5px solid var(--border-subtle)',
            borderRadius: 14,
            padding: '16px 18px',
            marginBottom: 16,
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <TrendingUp size={13} style={{ color: 'var(--accent-green)' }} />
              Points Dashboard
            </p>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--accent-green)',
                background: 'var(--status-approved-bg)',
                borderRadius: 5,
                padding: '2px 7px',
              }}
            >
              Verified
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                padding: '10px 6px',
                borderRadius: 10,
                background: 'var(--status-approved-bg)',
                border: '1px solid var(--status-approved-border)',
              }}
            >
              <p
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--accent-green)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <CheckCircle2 size={14} />
                {confirmedPoints}
              </p>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--accent-green)',
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Confirmed
              </p>
            </div>

            <div
              style={{
                padding: '10px 6px',
                borderRadius: 10,
                background: 'var(--status-pending-bg)',
                border: '1px solid var(--status-pending-border)',
              }}
            >
              <p
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--accent-amber)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <Clock size={14} />
                {pendingPoints}
              </p>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--accent-amber)',
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Pending
              </p>
            </div>

            <div
              style={{
                padding: '10px 6px',
                borderRadius: 10,
                background: 'var(--bg-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {displayLifetimePoints.toLocaleString()}
              </p>
              <p
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                Total Score
              </p>
            </div>
          </div>
        </div>

        {/* Card Footer: Metadata & Active Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-muted)',
            paddingTop: 4,
          }}
        >
          <span>Member since {joinMonth} {joinYear}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent-green)',
                boxShadow: '0 0 8px rgba(22, 163, 74, 0.6)',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-green)', fontWeight: 600 }}>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
