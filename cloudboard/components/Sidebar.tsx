'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/roleContext';
import { Department, UserRole } from '@/lib/services/types';
import { ROLE_RANK, getBadgeColors, getRoleMeta } from '@/lib/utils';
import {
  LayoutGrid,
  BarChart3,
  Trophy,
  Building2,
  FileCheck,
  CalendarCheck,
  ShieldCheck,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  departments: Department[];
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  deptHeadOnly?: boolean;
  leaderOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard', label: 'My Dashboard', icon: BarChart3 },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/departments', label: 'Departments', icon: Building2 },
  { href: '/submissions', label: 'Submissions', icon: FileCheck },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/dept-head', label: 'Dept Head Panel', icon: ShieldCheck, deptHeadOnly: true },
  { href: '/leader', label: 'Leader Panel', icon: Award, leaderOnly: true },
];

const DEPT_FALLBACK_COLORS: Record<string, string> = {
  'marketing-design': '#f59e0b',
  'budget-io': '#10b981',
  'delegate-handling': '#8b5cf6',
  'engineering': '#6366f1',
  'event-coordination': '#f43f5e',
};

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  departments,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentUser } = useRole();
  const [currentDeptParam, setCurrentDeptParam] = useState<string | null>(null);

  // Synchronize URL search params for active team selection
  useEffect(() => {
    const checkQuery = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setCurrentDeptParam(params.get('dept'));
      }
    };
    checkQuery();
    window.addEventListener('popstate', checkQuery);
    window.addEventListener('cloudboard-dept-selected', checkQuery);
    return () => {
      window.removeEventListener('popstate', checkQuery);
      window.removeEventListener('cloudboard-dept-selected', checkQuery);
    };
  }, [pathname]);

  const roleMeta = getRoleMeta(currentUser.role);
  const badgeColors = getBadgeColors(currentUser.role);

  const cleanPath = (pathname?.replace(/\/$/, '') || '') || '/';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 45,
            transition: 'opacity 0.25s ease',
          }}
          className="mobile-only"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`sidebar-container ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)',
          transform: mobileOpen ? 'translateX(0)' : undefined,
        }}
      >
        {/* Top Logo Section */}
        <div
          style={{
            height: 'var(--topbar-height)',
            display: 'flex',
            alignItems: 'center',
            padding: collapsed ? '0 16px' : '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <Link
            href="/"
            onClick={() => {
              setCurrentDeptParam(null);
              onCloseMobile();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                boxShadow: '0 4px 16px rgba(79, 70, 229, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              ☁
            </div>
            {!collapsed && (
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                }}
              >
                Cloud<span style={{ color: 'var(--accent-indigo)' }}>Board</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: collapsed ? '16px 8px' : '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const itemCleanHref = (item.href.replace(/\/$/, '') || '') || '/';
            const isActive =
              itemCleanHref === '/'
                ? cleanPath === '/' || cleanPath === ''
                : cleanPath === itemCleanHref || (cleanPath.startsWith(itemCleanHref) && itemCleanHref !== '/');

            const isDeptHeadRestricted =
              item.deptHeadOnly && ROLE_RANK[currentUser.role] < ROLE_RANK['dept-head'];
            const isLeaderRestricted =
              item.leaderOnly && ROLE_RANK[currentUser.role] < ROLE_RANK['leader'];
            const isRestricted = isDeptHeadRestricted || isLeaderRestricted;

            if (isRestricted) return null;

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (item.href === '/departments') {
                    setCurrentDeptParam(null);
                  }
                  onCloseMobile();
                }}
                data-tooltip={collapsed ? item.label : undefined}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                style={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '10px 0' : '10px 14px',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={19} />
                </span>
                {!collapsed && (
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}

          {/* TEAMS Section — Accessible to all users for direct department overviews */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {!collapsed ? (
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '4px 14px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Teams</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>OVERVIEW</span>
              </div>
            ) : (
              <div
                style={{
                  height: 1,
                  background: 'transparent',
                  margin: '4px 0',
                }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {departments.slice(0, 5).map((dept) => {
                const color = dept.color || DEPT_FALLBACK_COLORS[dept.id] || '#6366f1';
                const isTeamActive = cleanPath === '/departments' && currentDeptParam === dept.id;

                return (
                  <Link
                    key={dept.id}
                    href={`/departments?dept=${dept.id}`}
                    onClick={(e) => {
                      if (cleanPath === '/departments') {
                        e.preventDefault();
                        if (typeof window !== 'undefined') {
                          window.history.pushState(null, '', `/departments?dept=${dept.id}`);
                          window.dispatchEvent(
                            new CustomEvent('cloudboard-dept-selected', { detail: { deptId: dept.id } })
                          );
                        }
                      } else {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('cloudboard-dept-selected', { detail: { deptId: dept.id } })
                          );
                        }
                      }
                      setCurrentDeptParam(dept.id);
                      onCloseMobile();
                    }}
                    data-tooltip={collapsed ? dept.name : undefined}
                    className={`sidebar-link ${isTeamActive ? 'active' : ''}`}
                    style={{
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      padding: collapsed ? '8px 0' : '8px 14px',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span
                      className="sidebar-team-dot"
                      style={{
                        background: color,
                        boxShadow: isTeamActive ? `0 0 10px ${color}` : `0 0 6px ${color}50`,
                        transform: isTeamActive ? 'scale(1.2)' : 'scale(1)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    />
                    {!collapsed && (
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: isTeamActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          fontWeight: isTeamActive ? 700 : 500,
                        }}
                      >
                        {dept.name}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Mini Profile & Collapse Toggle at Bottom */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: collapsed ? '14px 8px' : '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: 10,
            background: 'var(--bg-subtle)',
          }}
        >
          {/* User info */}
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            data-tooltip={collapsed ? currentUser.name : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: `${currentUser.avatarColor}20`,
                border: `2px solid ${currentUser.avatarColor}`,
                color: currentUser.avatarColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                currentUser.avatarInitials
              )}
            </span>

            {!collapsed && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.2,
                  }}
                >
                  {currentUser.name}
                </div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: badgeColors.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginTop: 2,
                  }}
                >
                  {roleMeta.label}
                </div>
              </div>
            )}
          </Link>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="sidebar-collapse-btn desktop-only"
            style={{
              display: collapsed ? 'none' : 'flex',
            }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* If collapsed, put expand button centered at very bottom */}
        {collapsed && (
          <div
            style={{
              padding: '6px 0 10px',
              display: 'flex',
              justifyContent: 'center',
            }}
            className="desktop-only"
          >
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="sidebar-collapse-btn"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
