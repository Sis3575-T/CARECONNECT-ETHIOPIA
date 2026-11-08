import React from 'react';
import { Flame, Clock, ShieldCheck, AlertCircle } from 'lucide-react';

const PRIORITY_CONFIGS = {
  EMERGENCY: {
    label: 'Emergency',
    bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: Flame,
    pulse: true
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: Clock,
    pulse: false
  },
  ROUTINE: {
    label: 'Routine',
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: ShieldCheck,
    pulse: false
  }
};

export function ReferralPriorityBadge({ priority, className = '', showIcon = true }) {
  const normPriority = (priority || 'ROUTINE').toUpperCase().replace(/[\s-]/g, '_');
  const cfg = PRIORITY_CONFIGS[normPriority] || {
    label: priority || 'Routine',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: AlertCircle,
    pulse: false
  };

  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider ${cfg.bg} ${className}`}
    >
      {showIcon && (
        <Icon
          className={`w-3 h-3 shrink-0 ${cfg.pulse ? 'animate-pulse text-rose-600' : ''}`}
          aria-hidden="true"
        />
      )}
      <span>{cfg.label}</span>
    </span>
  );
}

export default ReferralPriorityBadge;
