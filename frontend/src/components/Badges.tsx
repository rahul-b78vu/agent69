import React from 'react';
import { Severity, AlertStatus, WarningCategory, Urgency } from '../types';

export const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const styles: Record<Severity, { wrap: string; dot: string; ping?: boolean }> = {
    LOW: {
      wrap: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold',
      dot: 'bg-emerald-600',
    },
    MEDIUM: {
      wrap: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold',
      dot: 'bg-amber-600',
    },
    HIGH: {
      wrap: 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold shadow-xs shadow-rose-500/10',
      dot: 'bg-rose-600',
      ping: true,
    },
  };

  const current = styles[severity] || styles.LOW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] border tracking-wide select-none ${current.wrap}`}>
      <span className="relative flex h-2 w-2 shrink-0">
        {current.ping && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.dot}`}></span>
      </span>
      <span>{severity}</span>
    </span>
  );
};

export const UrgencyBadge: React.FC<{ urgency: Urgency }> = ({ urgency }) => {
  const styles: Record<Urgency, string> = {
    ROUTINE: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
    PROMPT: 'bg-blue-50 text-blue-800 border-blue-300 font-extrabold',
    IMMEDIATE: 'bg-purple-50 text-purple-800 border-purple-300 font-extrabold shadow-xs shadow-purple-500/10',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] border uppercase tracking-wider select-none ${styles[urgency] || styles.ROUTINE}`}>
      {urgency}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AlertStatus }> = ({ status }) => {
  const styles: Record<AlertStatus, { wrap: string; dot: string; label: string }> = {
    NEW: {
      wrap: 'bg-blue-50 text-blue-800 border-blue-300',
      dot: 'bg-blue-600',
      label: 'NEW',
    },
    ACKNOWLEDGED: {
      wrap: 'bg-sky-50 text-sky-800 border-sky-300',
      dot: 'bg-sky-600',
      label: 'ACKNOWLEDGED',
    },
    IN_REVIEW: {
      wrap: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      dot: 'bg-indigo-600',
      label: 'IN REVIEW',
    },
    ACTION_TAKEN: {
      wrap: 'bg-teal-50 text-teal-800 border-teal-300',
      dot: 'bg-teal-600',
      label: 'ACTION TAKEN',
    },
    RESOLVED: {
      wrap: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-600',
      label: 'RESOLVED',
    },
    FALSE_POSITIVE: {
      wrap: 'bg-slate-100 text-slate-800 border-slate-300',
      dot: 'bg-slate-500',
      label: 'FALSE POSITIVE',
    },
    ESCALATED: {
      wrap: 'bg-red-50 text-red-800 border-red-300 font-extrabold',
      dot: 'bg-red-600',
      label: 'ESCALATED',
    },
  };

  const current = styles[status] || styles.NEW;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold border select-none ${current.wrap}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: WarningCategory }> = ({ category }) => {
  const labels: Record<WarningCategory, string> = {
    ACADEMIC_DIFFICULTY: 'Academic Difficulty',
    DISENGAGEMENT: 'Disengagement',
    FINANCIAL_DIFFICULTY: 'Financial Difficulty',
    HEALTH_PERSONAL: 'Health / Personal',
    GENERAL_EARLY_WARNING: 'General Early Warning',
  };

  const colors: Record<WarningCategory, string> = {
    ACADEMIC_DIFFICULTY: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    DISENGAGEMENT: 'bg-amber-50 text-amber-900 border-amber-300',
    FINANCIAL_DIFFICULTY: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    HEALTH_PERSONAL: 'bg-rose-50 text-rose-800 border-rose-300',
    GENERAL_EARLY_WARNING: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs border font-bold select-none ${colors[category] || colors.GENERAL_EARLY_WARNING}`}>
      {labels[category] || category}
    </span>
  );
};

