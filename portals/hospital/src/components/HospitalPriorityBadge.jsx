import React from 'react';
import { Flame, AlertTriangle, Clock } from 'lucide-react';

const PRIORITY_CONFIG = {
  EMERGENCY: {
    label: 'Emergency',
    bg: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200 border-rose-300 dark:border-rose-700',
    icon: Flame,
    pulse: true
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300 dark:border-amber-700',
    icon: AlertTriangle,
    pulse: false
  },
  ROUTINE: {
    label: 'Routine',
    bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: Clock,
    pulse: false
  }
};

export function HospitalPriorityBadge({ priority, className = '' }) {
  const normKey = (priority || 'ROUTINE').toUpperCase();
  const config = PRIORITY_CONFIG[normKey] || PRIORITY_CONFIG.ROUTINE;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${config.bg} ${className}`}
      role="status"
      aria-label={`Clinical Priority: ${config.label}`}
    >
      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${config.pulse ? 'animate-pulse text-rose-600' : ''}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export default HospitalPriorityBadge;
