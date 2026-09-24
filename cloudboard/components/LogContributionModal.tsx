'use client';

import React, { useState, useEffect, useId, useCallback } from 'react';
import { useRole } from '@/lib/roleContext';
import {
  DeptId,
  PointSubmission,
  SubmissionCategory,
  Department,
  User,
} from '@/lib/services/types';
import { submissionService, departmentService } from '@/lib/services';
import { validateSubmissionInput } from '@/lib/validations/schemas';
import { X, ArrowLeft, Check, Sparkles, Star } from 'lucide-react';

interface ContributionTemplate {
  id: string;
  title: string;
  description: string;
  category: SubmissionCategory;
  points: number;
  icon: string;
  color: string;
}

const CONTRIBUTION_TEMPLATES: ContributionTemplate[] = [
  {
    id: 'tpl-01',
    title: 'Helped a Teammate',
    description: 'Assisted a team member with their task or problem.',
    category: 'collaboration',
    points: 1,
    icon: '🤝',
    color: '#10b981',
  },
  {
    id: 'tpl-02',
    title: 'Delivered a Task on Time',
    description: 'Completed and submitted an assigned task before or by the deadline.',
    category: 'delivery',
    points: 2,
    icon: '✅',
    color: '#16a34a',
  },
  {
    id: 'tpl-03',
    title: 'Led a Meeting or Session',
    description: 'Organized and led a team meeting, workshop, or knowledge-sharing session.',
    category: 'leadership',
    points: 3,
    icon: '📢',
    color: '#f59e0b',
  },
  {
    id: 'tpl-04',
    title: 'Cross-Department Contribution',
    description: 'Provided meaningful support or collaboration to another department.',
    category: 'collaboration',
    points: 3,
    icon: '🔗',
    color: '#6366f1',
  },
  {
    id: 'tpl-05',
    title: 'Innovative Idea Implemented',
    description: 'Proposed and implemented a new idea that improved a process or product.',
    category: 'innovation',
    points: 4,
    icon: '💡',
    color: '#f97316',
  },
  {
    id: 'tpl-06',
    title: 'Exceptional Event Contribution',
    description: 'Made an outstanding contribution to an event or project beyond expectations.',
    category: 'culture',
    points: 5,
    icon: '🌟',
    color: '#8b5cf6',
  },
];

const POINT_COLORS: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', label: 'Basic' },
  2: { color: '#16a34a', bg: 'rgba(22, 163, 74, 0.12)', label: 'Good' },
  3: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', label: 'Great' },
  4: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', label: 'Excellent' },
  5: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', label: 'Outstanding' },
};

interface LogContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (sub: PointSubmission) => void;
}

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-overlay">
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 580 }}>
        {children}
      </div>
    </div>
  );
}

export default function LogContributionModal({
  isOpen,
  onClose,
  onSubmitted,
}: LogContributionModalProps) {
  const { currentUser, allUsers } = useRole();
  const formId = useId();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ContributionTemplate | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<DeptId>(currentUser.deptId);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [approverType, setApproverType] = useState<'dept-head' | 'leader'>('dept-head');
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    departmentService.getAllDepartments().then(setDepartments);
  }, []);

  const isCrossDept = targetDeptId !== currentUser.deptId;

  useEffect(() => {
    if (isOpen) {
      setStep('template');
      setSelectedTemplate(null);
      setTargetDeptId(currentUser.deptId);
      setTargetUserId('');
      setApproverType('dept-head');
      const head = allUsers.find((u) => u.deptId === currentUser.deptId && u.role === 'dept-head');
      setSelectedApproverId(head?.id || '');
      setReason('');
      setSubmitted(false);
      setError('');
    }
  }, [isOpen, currentUser.deptId, allUsers]);

  useEffect(() => {
    setTargetUserId('');
    if (approverType === 'dept-head') {
      const head = allUsers.find((u) => u.deptId === targetDeptId && u.role === 'dept-head');
      if (head) setSelectedApproverId(head.id);
    }
  }, [targetDeptId, approverType, allUsers]);

  const eligibleTargets = allUsers.filter(
    (u) => u.deptId === targetDeptId && u.id !== currentUser.id
  );

  const handleSelectTemplate = (tpl: ContributionTemplate) => {
    setSelectedTemplate(tpl);
    setStep('details');
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTemplate) {
        setError('Please select a contribution template.');
        return;
      }

      const input = {
        targetUserId,
        home_dept: currentUser.deptId,
        target_dept: targetDeptId,
        cross_dept: isCrossDept,
        points: selectedTemplate.points,
        reason: reason.trim(),
        category: selectedTemplate.category,
        requestedApproverId: selectedApproverId || undefined,
        requestedApproverRole: approverType,
      };

      const validation = validateSubmissionInput(input);
      if (!validation.valid) {
        setError(validation.errors[0]);
        return;
      }

      setIsSubmitting(true);
      setError('');

      try {
        const newSub = await submissionService.createSubmission(input, currentUser.id);
        setSubmitted(true);
        onSubmitted?.(newSub);
      } catch (err: any) {
        setError(err.message || 'Failed to submit contribution.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentUser, targetDeptId, targetUserId, selectedTemplate, reason, isCrossDept, approverType, selectedApproverId, onSubmitted]
  );

  if (!isOpen) return null;

  if (submitted && selectedTemplate) {
    const pc = POINT_COLORS[selectedTemplate.points];
    return (
      <ModalOverlay onClose={onClose}>
        <div className="log-modal animate-fade-in-up">
          <div style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                color: 'var(--accent-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 20px',
              }}
            >
              <Check size={36} />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Contribution Logged!
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Your submission is now{' '}
              <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>pending approval</span>.
            </p>
            {/* Template used */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg-muted)',
                border: `1px solid ${selectedTemplate.color}40`,
                borderRadius: 12,
                padding: '8px 18px',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{selectedTemplate.icon}</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: selectedTemplate.color }}>
                {selectedTemplate.title}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: pc.color,
                  background: pc.bg,
                  borderRadius: 6,
                  padding: '2px 8px',
                }}
              >
                +{selectedTemplate.points} pts · {pc.label}
              </span>
            </div>

            {isCrossDept && (
              <div
                style={{
                  margin: '8px auto 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(99, 102, 241, 0.12)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  color: 'var(--accent-indigo)',
                  fontWeight: 600,
                }}
              >
                🔗 Cross-Department Contribution
              </div>
            )}

            <button onClick={onClose} className="cb-btn-primary" style={{ marginTop: 24, width: '100%' }}>
              Done
            </button>
          </div>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="log-modal animate-fade-in-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {step === 'details' && selectedTemplate && (
              <button
                onClick={() => setStep('template')}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--accent-indigo-subtle)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                color: 'var(--accent-indigo)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {step === 'template' ? 'Log a Contribution' : 'Add Details'}
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {step === 'template' ? 'Choose a contribution category & tier' : 'Specify recipient and work description'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── STEP 1: Template Selection ── */}
        {step === 'template' && (
          <div style={{ padding: '20px 24px 28px' }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
              Select the tier that best matches what you want to recognise. Points and review tier are preset:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CONTRIBUTION_TEMPLATES.map((tpl) => {
                const pc = POINT_COLORS[tpl.points];
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '16px 18px',
                      borderRadius: 14,
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = tpl.color;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 4px 16px ${tpl.color}18`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        flexShrink: 0,
                        background: `${tpl.color}15`,
                        border: `1.5px solid ${tpl.color}35`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.35rem',
                      }}
                    >
                      {tpl.icon}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {tpl.title}
                      </p>
                      <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {tpl.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            color: tpl.color,
                            background: `${tpl.color}15`,
                            borderRadius: 4,
                            padding: '2px 8px',
                          }}
                        >
                          {tpl.category}
                        </span>
                        {/* Stars */}
                        <div style={{ display: 'flex', gap: 2, color: pc.color }}>
                          {Array.from({ length: tpl.points }).map((_, i) => (
                            <Star key={i} size={11} fill={pc.color} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <div
                        style={{
                          minWidth: 54,
                          padding: '6px 10px',
                          borderRadius: 10,
                          background: pc.bg,
                          border: `1.5px solid ${pc.color}40`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: pc.color, lineHeight: 1 }}>
                          +{tpl.points}
                        </span>
                        <span style={{ fontSize: '0.58rem', fontWeight: 700, color: pc.color, textTransform: 'uppercase', marginTop: 2 }}>
                          {pc.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 2: Details Form ── */}
        {step === 'details' && selectedTemplate && (
          <form id={formId} onSubmit={handleSubmit} style={{ padding: '20px 24px 28px' }}>
            {/* Selected template summary (read-only) */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                marginBottom: 20,
                background: 'var(--bg-muted)',
                border: `1.5px solid ${selectedTemplate.color}40`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{selectedTemplate.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedTemplate.title}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {selectedTemplate.category} · Fixed tier
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: POINT_COLORS[selectedTemplate.points].bg,
                  border: `1.5px solid ${POINT_COLORS[selectedTemplate.points].color}50`,
                  borderRadius: 10,
                  padding: '6px 12px',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: POINT_COLORS[selectedTemplate.points].color }}>
                  +{selectedTemplate.points}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: POINT_COLORS[selectedTemplate.points].color }}>
                  pts
                </span>
              </div>
            </div>

            {/* Target Department */}
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Target Department
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {departments.map((dept) => {
                  const isSelected = dept.id === targetDeptId;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setTargetDeptId(dept.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 10,
                        cursor: 'pointer',
                        border: `1.5px solid ${isSelected ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'var(--accent-indigo-subtle)' : 'var(--bg-card)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{dept.icon}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? 'var(--accent-indigo)' : 'var(--text-secondary)',
                          textAlign: 'center',
                        }}
                      >
                        {dept.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient */}
            <div style={{ marginTop: 18 }}>
              <label htmlFor={`${formId}-recipient`} style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Recipient
              </label>
              <select
                id={`${formId}-recipient`}
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="custom-select"
              >
                <option value="">— Select a team member —</option>
                {eligibleTargets.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Approver Selection */}
            <div style={{ marginTop: 18 }}>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                Assign Approver
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setApproverType('dept-head');
                    const head = allUsers.find((u) => u.deptId === targetDeptId && u.role === 'dept-head');
                    if (head) setSelectedApproverId(head.id);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: `1.5px solid ${approverType === 'dept-head' ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`,
                    background: approverType === 'dept-head' ? 'var(--accent-indigo-subtle)' : 'var(--bg-card)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: approverType === 'dept-head' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                    🏛 Dept Head
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Department review
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApproverType('leader');
                    const leader = allUsers.find((u) => u.role === 'leader');
                    if (leader) setSelectedApproverId(leader.id);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: `1.5px solid ${approverType === 'leader' ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`,
                    background: approverType === 'leader' ? 'var(--accent-indigo-subtle)' : 'var(--bg-card)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: approverType === 'leader' ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>
                    🌐 Leader
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Executive review
                  </p>
                </button>
              </div>

              <select
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
                className="custom-select"
                style={{ fontSize: '0.82rem' }}
              >
                {approverType === 'dept-head' ? (
                  <>
                    {allUsers
                      .filter((u) => u.role === 'dept-head')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (Head of {departments.find((d) => d.id === u.deptId)?.shortName || u.deptId})
                        </option>
                      ))}
                  </>
                ) : (
                  <>
                    {allUsers
                      .filter((u) => u.role === 'leader')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (Executive Leader)
                        </option>
                      ))}
                  </>
                )}
              </select>
            </div>

            {/* Description */}
            <div style={{ marginTop: 18 }}>
              <label htmlFor={`${formId}-reason`} style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                What did they do?
              </label>
              <textarea
                id={`${formId}-reason`}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                placeholder={`E.g. ${selectedTemplate.description} Provide details on their contribution and impact…`}
                rows={4}
                className="log-textarea"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Min 15 characters</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: reason.length >= 15 ? 'var(--accent-green)' : 'var(--text-muted)',
                  }}
                >
                  {reason.length} chars {reason.length >= 15 && '✓'}
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--status-rejected-text)',
                  marginTop: 14,
                  background: 'var(--status-rejected-bg)',
                  border: '1px solid var(--status-rejected-border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                ⚠ {error}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="button" onClick={() => setStep('template')} className="cb-btn-ghost" style={{ flex: 1 }}>
                ← Back
              </button>
              <button type="submit" disabled={isSubmitting} className="cb-btn-primary" style={{ flex: 2 }}>
                {isSubmitting ? 'Submitting...' : '✓ Submit Contribution'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
