import React from 'react';
import {
  Clock,
  CheckCircle2,
  Truck,
  UserCheck,
  FileText,
  ShieldCheck,
  User,
  Building,
  AlertCircle
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

function getEventBadge(eventType) {
  const t = (eventType || '').toUpperCase();
  if (t.includes('ARRIVAL') || t.includes('ARRIVED')) {
    return {
      label: 'Physical Arrival',
      icon: Truck,
      color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    };
  }
  if (t.includes('HANDOVER')) {
    return {
      label: 'Escort Handover',
      icon: UserCheck,
      color: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    };
  }
  if (t.includes('PROGRESS') || t.includes('ADMIT') || t.includes('RECEIVED')) {
    return {
      label: 'Ward Admission',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }
  if (t.includes('ACCEPT')) {
    return {
      label: 'Referral Accepted',
      icon: CheckCircle2,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    };
  }
  return {
    label: eventType || 'Workflow Transition',
    icon: Clock,
    color: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };
}

export default function ReceivingHistoryTimeline({
  timeline = [],
  historyData = null,
  referral = null
}) {
  const statusHistory = historyData?.history || [];
  const allTimelineEvents = [...timeline];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Receiving Audit Timeline & Handover History
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Server-Authoritative Audit Trail
        </span>
      </div>

      {allTimelineEvents.length === 0 && statusHistory.length === 0 ? (
        <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
          <Clock className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
          <p>Referral accepted. Physical arrival and receiving events will be logged here chronologically.</p>
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700 pt-1">
          {allTimelineEvents.map((evt, idx) => {
            const badge = getEventBadge(evt.event_name || evt.event_type);
            const BadgeIcon = badge.icon;

            return (
              <div key={evt.id || idx} className="flex items-start gap-3 relative pl-6">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-slate-800 absolute left-2 top-1.5" />
                <div className="space-y-1 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      {evt.status && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          {evt.status}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {evt.created_at ? formatClinicalDate(evt.created_at) : 'Recorded'} ({evt.created_at ? formatRelativeTime(evt.created_at) : 'Active'})
                    </span>
                  </div>

                  {evt.notes && (
                    <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed italic">
                      "{evt.notes}"
                    </p>
                  )}

                  {evt.actor_name && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <User className="w-3 h-3" />
                      <span>Recorded by: <strong>{evt.actor_name}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security and Governance Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          Arrival confirmation, clinical handovers, and ward admissions are permanently archived in compliance with Ethiopian healthcare data governance.
        </span>
      </div>
    </div>
  );
}
