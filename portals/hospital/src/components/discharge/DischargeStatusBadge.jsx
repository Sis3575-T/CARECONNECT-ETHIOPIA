import React from 'react';
import {
  CheckCircle2,
  Share2,
  CornerDownLeft,
  Bed,
  Archive,
  AlertOctagon,
  AlertTriangle,
  Clock
} from 'lucide-react';

/**
 * CareConnect Ethiopia - Discharge & Outcome Status Badge
 * Standardized status visualization across hospital discharge, transfer, and outcome tracking
 */
export function DischargeStatusBadge({ status, isTransferred, isCounterReferred, className = '' }) {
  const norm = String(status || '').toUpperCase();

  let config = {
    label: 'Under Care',
    icon: Bed,
    bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
  };

  if (isTransferred || norm === 'TRANSFERRED') {
    config = {
      label: 'Transferred Out',
      icon: Share2,
      bg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    };
  } else if (isCounterReferred || norm === 'RETURNED_TO_REFERRING_FACILITY' || norm === 'COUNTER_REFERRED') {
    config = {
      label: 'Counter-Referred to HC',
      icon: CornerDownLeft,
      bg: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
    };
  } else {
    switch (norm) {
      case 'COMPLETED':
      case 'DISCHARGED':
        config = {
          label: 'Discharged',
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
      case 'DECEASED':
        config = {
          label: 'Deceased',
          icon: AlertOctagon,
          bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        };
        break;
      case 'AGAINST_MEDICAL_ADVICE':
      case 'LEFT_AMA':
        config = {
          label: 'Discharged AMA',
          icon: AlertTriangle,
          bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        };
        break;
      case 'IN_PROGRESS':
        config = {
          label: 'Admitted — In Care',
          icon: Bed,
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
        };
        break;
      case 'PATIENT_ARRIVED':
      case 'ARRIVED':
        config = {
          label: 'Arrived (Pending Placement)',
          icon: Clock,
          bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        };
        break;
      default:
        config = {
          label: norm.replace(/_/g, ' ') || 'Unknown',
          icon: Bed,
          bg: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
        };
    }
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${className}`}
      data-testid="discharge-status-badge"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}

export default DischargeStatusBadge;
