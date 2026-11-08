import React from 'react';
import {
  Clock,
  CheckCircle2,
  Truck,
  UserCheck,
  Building,
  AlertCircle
} from 'lucide-react';

export default function ArrivalStatusBadge({ status }) {
  const s = (status || '').toUpperCase();

  switch (s) {
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          <span>Awaiting Departure</span>
        </span>
      );

    case 'TRANSPORT_ASSIGNED':
    case 'IN_TRANSIT':
    case 'DISPATCHED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800 animate-pulse">
          <Truck className="w-3 h-3" />
          <span>En Route to Hospital</span>
        </span>
      );

    case 'PATIENT_ARRIVED':
    case 'ARRIVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <UserCheck className="w-3 h-3" />
          <span>Arrived — Pending Handover</span>
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          <span>Admitted to Ward</span>
        </span>
      );

    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-3 h-3" />
          <span>Care Completed</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span>{status || 'Unknown'}</span>
        </span>
      );
  }
}
