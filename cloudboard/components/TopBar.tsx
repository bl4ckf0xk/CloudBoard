'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/roleContext';
import { UserRole } from '@/lib/services/types';
import { getBadgeColors, getRoleMeta } from '@/lib/utils';
import { Department } from '@/lib/services/types';
import AuthModal from '@/components/auth/AuthModal';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Plus,
  Menu,
  ChevronDown,
  LogOut,
  KeyRound,
  BarChart3,
  Trophy,
  Building2,
  PenLine,
} from 'lucide-react';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  onOpenLogModal: () => void;
  currentDept: Department | null;
}

const ROUTE_INFO: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Performance Tracking',
    subtitle: 'Q3 recognition cycle · Cross-department performance',
  },
  '/dashboard': {
    title: 'My Dashboard',
    subtitle: 'Your personal contributions, activity & points history',
  },
  '/submissions': {
    title: 'Submissions Feed',
    subtitle: 'Cross-team recognitions, logged tasks & peer rewards',
  },
  '/leaderboard': {
    title: 'Leaderboard',
    subtitle: 'Top individual contributors & team performance scores',
  },
  '/departments': {
    title: 'Departments',
    subtitle: 'Team rosters, committee structures & active statistics',
  },
  '/attendance': {
    title: 'Attendance',
    subtitle: 'Event logs, committee meetings & attendance verification',
  },
  '/dept-head': {
    title: 'Dept Head Review',
    subtitle: 'Review & approve pending team contribution submissions',
  },
  '/leader': {
    title: 'Leader Panel',
    subtitle: 'Executive approvals, system metrics & member management',
  },
};

const PROFILE_TABS = [
  { href: '/dashboard', label: 'My Dashboard', icon: BarChart3, color: '#10b981' },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, color: '#f59e0b' },
  { href: '/departments', label: 'Departments', icon: Building2, color: '#6366f1' },
];

export default function TopBar({
  onOpenMobileSidebar,
  onOpenLogModal,
  currentDept,
}: TopBarProps) {
  const pathname = usePathname();
  const { currentUser, isAuthenticated, signOut } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const dropdownId = useId();

  const routeMeta = ROUTE_INFO[pathname] || {
    title: 'Performance Tracking',
    subtitle: 'CloudBoard internal performance & recognition',
  };

  const roleMeta = getRoleMeta(currentUser.role);
  const badgeColors = getBadgeColors(currentUser.role);

  // Initialize theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cloudboard_theme') as 'light' | 'dark' | null;
      if (saved) {
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        const isDarkPreferred = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDarkPreferred) {
          setTheme('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('cloudboard_theme', next);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('data-theme', next);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="topbar-container">
      {/* Left: Mobile hamburger & Page Title / Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <button
          onClick={onOpenMobileSidebar}
          className="mobile-only"
          aria-label="Open navigation menu"
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1.5px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Menu size={20} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {routeMeta.title}
          </h1>
          <p
            className="desktop-only"
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {routeMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search + Notifications + Theme Toggle + CTA Button + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Search Input (Desktop) */}
        <div className="topbar-search desktop-only">
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search members, tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Notification Bell */}
        <button
          aria-label="Notifications"
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1.5px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.2s ease',
          }}
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent-indigo)',
              boxShadow: '0 0 6px var(--accent-indigo)',
            }}
          />
        </button>

        {/* Animated Dark/Light Mode Switch */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="theme-switch-track"
        >
          <Sun size={13} style={{ color: '#f59e0b', marginLeft: 4, zIndex: 1 }} />
          <Moon size={13} style={{ color: '#818cf8', marginRight: 4, zIndex: 1 }} />
          <span className="theme-switch-thumb">
            {theme === 'light' ? (
              <Sun size={11} style={{ color: '#f59e0b' }} />
            ) : (
              <Moon size={11} style={{ color: '#ffffff' }} />
            )}
          </span>
        </button>

        {/* Primary CTA Button: + Log Contribution */}
        <button
          onClick={onOpenLogModal}
          className="cb-btn-primary"
          style={{
            padding: '9px 18px',
            fontSize: '0.84rem',
            whiteSpace: 'nowrap',
          }}
        >
          <PenLine size={16} />
          <span className="desktop-only">+ Log Contribution</span>
          <span className="mobile-only">+ Log</span>
        </button>

        {/* User Profile Dropdown Trigger */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            id={triggerId}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-controls={dropdownId}
            onClick={() => setDropdownOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 8px 5px 5px',
              cursor: 'pointer',
              border: '1.5px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'inherit',
              font: 'inherit',
              outline: 'none',
              borderRadius: 12,
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `${currentUser.avatarColor}20`,
                border: `2px solid ${currentUser.avatarColor}`,
                color: currentUser.avatarColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {currentUser.avatarInitials}
            </span>

            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-muted)',
                transition: 'transform 0.2s ease',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </button>

          {/* User Profile Dropdown Menu */}
          {dropdownOpen && (
            <div
              id={dropdownId}
              className="dropdown-glass animate-slide-down"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: 290,
                padding: '12px',
                zIndex: 100,
              }}
            >
              {/* Profile summary */}
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `${currentUser.avatarColor}25`,
                    border: `2px solid ${currentUser.avatarColor}`,
                    color: currentUser.avatarColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {currentUser.avatarInitials}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentUser.name}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        background: badgeColors.bg,
                        color: badgeColors.text,
                        border: `1px solid ${badgeColors.border}`,
                        borderRadius: 6,
                        padding: '1px 6px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {roleMeta.label}
                    </span>
                    {currentDept && <span>· {currentDept.shortName}</span>}
                  </div>
                </div>
              </div>

              {/* Navigation links */}
              <div style={{ padding: '2px 4px 6px' }}>
                <div
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    padding: '4px 8px 6px',
                  }}
                >
                  Quick Navigation
                </div>
                {PROFILE_TABS.map((tab) => {
                  const isActive = pathname === tab.href;
                  const Icon = tab.icon;
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 8,
                        textDecoration: 'none',
                        marginBottom: 2,
                        background: isActive ? 'var(--bg-subtle)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--border-active)' : 'transparent'}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `${tab.color}15`,
                          color: tab.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={15} />
                      </span>
                      <span
                        style={{
                          fontSize: '0.84rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? 'var(--accent-indigo)' : 'var(--text-primary)',
                        }}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Authentication */}
              <div style={{ padding: '8px 4px 4px', borderTop: '1px solid var(--border-subtle)' }}>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <LogOut size={14} /> Sign Out of AWS
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalOpen(true);
                      setDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(79, 70, 229, 0.3)',
                      background: 'rgba(79, 70, 229, 0.1)',
                      color: 'var(--accent-indigo)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <KeyRound size={14} /> Sign In with Cognito
                  </button>
                )}
              </div>

              {/* Footer status */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: 6,
                  padding: '6px 10px 2px',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: isAuthenticated ? '#10b981' : '#f59e0b',
                    }}
                  />
                  <span>{isAuthenticated ? 'AWS Cognito Live' : 'Simulated Session'}</span>
                </div>
                <kbd
                  style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    fontSize: '0.62rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  Esc
                </kbd>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cognito Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
}
