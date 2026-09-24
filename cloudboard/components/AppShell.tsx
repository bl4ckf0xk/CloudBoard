'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import LogContributionModal from '@/components/LogContributionModal';
import { Department } from '@/lib/services/types';
import { departmentService } from '@/lib/services';
import { useRole } from '@/lib/roleContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser } = useRole();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentDept, setCurrentDept] = useState<Department | null>(null);

  // Initialize sidebar collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cloudboard_sidebar_collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      } else if (typeof window !== 'undefined' && window.innerWidth < 1100 && window.innerWidth >= 768) {
        setSidebarCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cloudboard_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Load departments
  useEffect(() => {
    let isMounted = true;
    departmentService.getAllDepartments().then((depts) => {
      if (isMounted) setDepartments(depts);
    });
    departmentService.getDepartmentById(currentUser.deptId).then((dept) => {
      if (isMounted) setCurrentDept(dept);
    });
    return () => {
      isMounted = false;
    };
  }, [currentUser.deptId]);

  // Listen for open-log-modal custom event
  useEffect(() => {
    const handleOpenModal = () => setLogModalOpen(true);
    window.addEventListener('open-log-modal', handleOpenModal);
    return () => window.removeEventListener('open-log-modal', handleOpenModal);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        departments={departments}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed
            ? 'var(--sidebar-width-collapsed)'
            : 'var(--sidebar-width-expanded)',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <TopBar
          onOpenMobileSidebar={() => setMobileOpen(true)}
          onOpenLogModal={() => setLogModalOpen(true)}
          currentDept={currentDept}
        />

        <main
          style={{
            flex: 1,
            position: 'relative',
            zIndex: 1,
            padding: '32px 28px',
          }}
        >
          {children}
        </main>

        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '20px 28px',
            textAlign: 'center',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            transition: 'background-color 0.25s ease, color 0.25s ease',
            position: 'relative',
            zIndex: 1,
          }}
        >
          CloudBoard · Enterprise Performance & Recognition Platform
        </footer>
      </div>

      {/* Global Log Contribution Modal */}
      <LogContributionModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        onSubmitted={() => {
          window.dispatchEvent(new CustomEvent('contribution-submitted'));
        }}
      />
    </div>
  );
}
