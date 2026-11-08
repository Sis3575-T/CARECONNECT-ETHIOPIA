import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Truck,
  Building,
  FileCheck,
  AlertCircle
} from 'lucide-react';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: Clock
  },
  SUBMITTED: {
    label: 'New Incoming',
    bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: AlertCircle
  },
  PENDING: {
    label: 'Pending Triage',
    bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Clock
  },
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    bg: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    icon: Clock
  },
  IN_REVIEW: {
    label: 'In Triage Review',
    bg: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    icon: Clock
  },
  ACCEPTED: {
    label: 'Accepted',
    bg: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: XCircle
  },
  INFO_REQUESTED: {
    label: 'Info Requested',
    bg: 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    icon: HelpCircle
  },
  IN_TRANSIT: {
    label: 'In Transit',
    bg: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: Truck
  },
  TRANSFERRED: {
    label: 'In Transit',
    bg: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: Truck
  },
  ARRIVED: {
    label: 'Patient Arrived',
    bg: 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    icon: Building
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    icon: FileCheck
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    icon: XCircle
  }
};

export default function HospitalStatusBadge({ status, className = '' }) {
  const normKey = (status || '').toUpperCase().replace(/[\s-]/g, '_');
  const config = STATUS_CONFIG[normKey] || {
    label: status || 'Unknown',
    bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
    icon: Clock
  };

  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
