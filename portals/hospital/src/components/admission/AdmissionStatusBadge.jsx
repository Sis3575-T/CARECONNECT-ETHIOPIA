import React from 'react';
import { Clock, Bed, CheckCircle2, Archive, AlertCircle } from 'lucide-react';

/**
 * CareConnect Ethiopia - Admission Status Badge
 * Standardized status visualization across hospital inpatient admission tracking
 */
export function AdmissionStatusBadge({ status, className = '' }) {
  const norm = String(status || '').toUpperCase();

  let config = {
    label: 'Received',
    icon: Clock,
    bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  };

  switch (norm) {
    case 'ARRIVED':
    case 'PATIENT_ARRIVED':
      config = {
        label: 'Arrived — Pending Placement',
        icon: Clock,
        bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      };
      break;
    case 'IN_PROGRESS':
      config = {
        label: 'Admitted — In Active Care',
        icon: Bed,
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
      };
      break;
    case 'COMPLETED':
      config = {
        label: 'Care Completed',
        icon: CheckCircle2,
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      };
      break;
    case 'CLOSED':
      config = {
        label: 'Dossier Closed',
        icon: Archive,
        bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
      };
      break;
    case 'ACCEPTED':
      config = {
        label: 'Accepted (Awaiting Arrival)',
        icon: CheckCircle2,
        bg: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
      };
      break;
    default:
      config = {
        label: norm.replace(/_/g, ' ') || 'Unknown',
        icon: AlertCircle,
        bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
      };
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      data-testid="admission-status-badge"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export default AdmissionStatusBadge;
