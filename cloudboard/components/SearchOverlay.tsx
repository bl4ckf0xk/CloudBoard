'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { userService, submissionService, departmentService } from '@/lib/services';
import { User, PointSubmission, Department } from '@/lib/services/types';
import { getBadgeColors, getRoleMeta } from '@/lib/utils';
import {
  Search,
  Users,
  Award,
  Building2,
  Navigation,
  ArrowRight,
  X,
  CornerDownLeft,
} from 'lucide-react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const QUICK_LINKS = [
  { href: '/', title: 'Home & Overview', desc: 'Org performance & departmental rankings', icon: Navigation },
  { href: '/dashboard', title: 'My Dashboard', desc: 'Personal recognitions, timeline & points breakdown', icon: Award },
  { href: '/submissions', title: 'Submissions Feed', desc: 'Live recognitions, peer rewards & feed', icon: Award },
  { href: '/leaderboard', title: 'Global Leaderboard', desc: 'Contributor standings & rank podiums', icon: Users },
  { href: '/departments', title: 'Department Directory', desc: 'Teams, rosters & committee member details', icon: Building2 },
  { href: '/attendance', title: 'Attendance Management', desc: 'Session logs & attendance rate verification', icon: Navigation },
  { href: '/dept-head', title: 'Dept Head Review', desc: 'Review & approve pending contributions', icon: Building2 },
  { href: '/leader', title: 'Leader Oversight', desc: 'Executive governance, audit logs & points override', icon: Users },
];

export default function SearchOverlay({ isOpen, onClose, initialQuery = '' }: SearchOverlayProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<PointSubmission[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      Promise.all([
        userService.getAllUsers(),
        submissionService.getSubmissions(),
        departmentService.getAllDepartments(),
      ]).then(([allUsers, allSubs, allDepts]) => {
        setUsers(allUsers);
        setSubmissions(allSubs);
        setDepartments(allDepts);
      });
    }
  }, [isOpen, initialQuery]);

  // Global Cmd+K trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredMembers = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return users
      .filter((u) => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q))
      .slice(0, 5);
  }, [users, query]);

  const filteredDepartments = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return departments
      .filter((d) => d.name.toLowerCase().includes(q) || d.shortName.toLowerCase().includes(q))
      .slice(0, 3);
  }, [departments, query]);

  const filteredSubmissions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return submissions
      .filter((s) => s.reason.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .slice(0, 4);
  }, [submissions, query]);

  const filteredQuickLinks = useMemo(() => {
    if (!query.trim()) return QUICK_LINKS.slice(0, 4);
    const q = query.toLowerCase();
    return QUICK_LINKS.filter((l) => l.title.toLowerCase().includes(q) || l.desc.toLowerCase().includes(q));
  }, [query]);

  // Combined flat items for keyboard navigation
  const allResults = useMemo(() => {
    const items: { type: string; title: string; href?: string; onClick: () => void }[] = [];
    filteredMembers.forEach((m) => {
      items.push({
        type: 'member',
        title: m.name,
        onClick: () => {
          router.push(`/leaderboard`);
          onClose();
        },
      });
    });
    filteredDepartments.forEach((d) => {
      items.push({
        type: 'dept',
        title: d.name,
        onClick: () => {
          router.push(`/departments`);
          onClose();
        },
      });
    });
    filteredSubmissions.forEach((s) => {
      items.push({
        type: 'submission',
        title: s.reason,
        onClick: () => {
          router.push(`/submissions`);
          onClose();
        },
      });
    });
    filteredQuickLinks.forEach((l) => {
      items.push({
        type: 'page',
        title: l.title,
        onClick: () => {
          router.push(l.href);
          onClose();
        },
      });
    });
    return items;
  }, [filteredMembers, filteredDepartments, filteredSubmissions, filteredQuickLinks, router, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        allResults[selectedIndex].onClick();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0 }} />

      <div
        className="glass-card animate-slide-down"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 620,
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            gap: 12,
          }}
        >
          <Search size={20} style={{ color: 'var(--accent-indigo)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search members, tasks, departments, or pages..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: 'var(--text-primary)',
              fontWeight: 600,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              padding: '2px 7px',
              fontSize: '0.68rem',
              fontWeight: 700,
              borderRadius: 6,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '12px 14px' }}>
          {/* Members */}
          {filteredMembers.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '4px 8px 8px' }}>
                Team Members
              </p>
              {filteredMembers.map((m) => {
                const bc = getBadgeColors(m.role);
                const meta = getRoleMeta(m.role);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      router.push('/leaderboard');
                      onClose();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: 6,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: `${m.avatarColor}20`,
                          border: `1.5px solid ${m.avatarColor}`,
                          color: m.avatarColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                        }}
                      >
                        {m.avatarInitials}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {m.name}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {m.deptId}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: bc.text,
                          background: bc.bg,
                          border: `1px solid ${bc.border}`,
                          borderRadius: 4,
                          padding: '2px 6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                        {m.totalPoints} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Departments */}
          {filteredDepartments.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '4px 8px 8px' }}>
                Departments
              </p>
              {filteredDepartments.map((d) => (
                <div
                  key={d.id}
                  onClick={() => {
                    router.push('/departments');
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.2rem' }}>{d.icon}</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {d.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {d.memberCount} members →
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Submissions */}
          {filteredSubmissions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '4px 8px 8px' }}>
                Recent Recognitions
              </p>
              {filteredSubmissions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    router.push('/submissions');
                    onClose();
                  }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                      {s.category}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                      +{s.points} pts
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.reason}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Page Links */}
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', padding: '4px 8px 8px' }}>
              Pages & Navigation
            </p>
            {filteredQuickLinks.map((l) => {
              const Icon = l.icon;
              return (
                <div
                  key={l.href}
                  onClick={() => {
                    router.push(l.href);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'var(--accent-indigo-subtle)',
                        color: 'var(--accent-indigo)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {l.title}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {l.desc}
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 5px' }}>↑↓</kbd> navigate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '1px 5px' }}>↵</kbd> select
            </span>
          </div>
          <span>CloudBoard Global Search</span>
        </div>
      </div>
    </div>
  );
}
