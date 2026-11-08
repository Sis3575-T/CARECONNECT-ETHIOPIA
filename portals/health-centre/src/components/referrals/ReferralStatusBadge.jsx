import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  Building,
  CheckCheck,
  Ban,
  FileQuestion
} from 'lucide-react';

const STATUS_CONFIGS = {
  DRAFT: {
    label: 'Draft',
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: Clock
  },
  SUBMITTED: {
    label: 'Submitted / Pending Triage',
    bg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    icon: Clock
  },
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: CheckCircle2
  },
  ACCEPTED: {
    label: 'Accepted by Hospital',
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Rejected / Declined',
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: XCircle
  },
  INFO_REQUESTED: {
    label: 'Info Requested',
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: AlertTriangle
  },
  IN_TRANSIT: {
    label: 'In Transit',
    bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: Truck
  },
  ARRIVED: {
    label: 'Patient Arrived',
    bg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    icon: Building
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border-green-300 dark:border-green-800',
    icon: CheckCheck
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    icon: Ban
  }
};

export function ReferralStatusBadge({ status, className = '', showIcon = true }) {
  const normStatus = (status || 'SUBMITTED').toUpperCase().replace(/[\s-]/g, '_');
  const cfg = STATUS_CONFIGS[normStatus] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: FileQuestion
  };

  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.bg} ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      <span>{cfg.label}</span>
    </span>
  );
}

export default ReferralStatusBadge;
