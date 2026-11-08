import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  FileText,
  User,
  Building,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

function getDecisionBadge(decision) {
  const d = (decision || '').toUpperCase();
  if (d === 'ACCEPT' || d === 'ACCEPTED') {
    return {
      label: 'Accepted',
      icon: CheckCircle2,
      style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }
  if (d === 'REJECT' || d === 'REJECTED') {
    return {
      label: 'Rejected',
      icon: XCircle,
      style: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    };
  }
  if (d === 'REQUEST_INFO' || d === 'INFO_REQUESTED') {
    return {
      label: 'Info Requested',
      icon: HelpCircle,
      style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }
  if (d === 'ACKNOWLEDGE' || d === 'ACKNOWLEDGED') {
    return {
      label: 'Acknowledged',
      icon: ShieldCheck,
      style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    };
  }
  return {
    label: decision || 'Recorded',
    icon: Clock,
    style: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  };
}

export default function ReferralDecisionHistory({
  timeline = [],
  historyData = null,
  referral = null
}) {
  const decisions = historyData?.decisions || [];
  const statusHistory = historyData?.history || [];

  // Merge decisions and timeline items into unified chronological audit entries
  const allEvents = [...timeline];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Referral Triage Decisions & Audit Timeline
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Immutable Verifiable Log
        </span>
      </div>

      {/* Decisions Log if Available */}
      {decisions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Clinical Triage Determinations
          </h4>
          <div className="space-y-2.5">
            {decisions.map((dec, idx) => {
              const badge = getDecisionBadge(dec.decision);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={dec.id || idx}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.style}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      {dec.allocated_ward_department && (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Ward: {dec.allocated_ward_department}
                        </span>
                      )}
                      {dec.rejection_reason_code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded font-semibold">
                          {dec.rejection_reason_code}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {dec.created_at ? formatClinicalDate(dec.created_at) : 'Recorded'} ({dec.created_at ? formatRelativeTime(dec.created_at) : 'Active'})
                    </span>
                  </div>

                  {dec.decision_notes && (
                    <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 leading-relaxed italic">
                      "{dec.decision_notes}"
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    {dec.evaluating_clinician_id && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Clinician ID: <strong className="font-mono">{dec.evaluating_clinician_id.slice(0, 8)}</strong></span>
                      </span>
                    )}
                    {dec.recommended_alternative_facility_id && (
                      <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <Building className="w-3 h-3" />
                        <span>Alternative Rec: {dec.recommended_alternative_facility_id}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Audit Timeline */}
      <div className="space-y-3 pt-2">
        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Chronological Event History
        </h4>

        {allEvents.length === 0 ? (
          <div className="py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
            <Clock className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
            <p>Initial submission recorded. No subsequent transitions logged.</p>
          </div>
        ) : (
          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
            {allEvents.map((evt, idx) => (
              <div key={evt.id || idx} className="flex items-start gap-3 relative pl-6">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-slate-800 absolute left-2 top-1" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">
                      {evt.event_name || evt.event_type || 'Referral Transition'}
                    </p>
                    {evt.status && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {evt.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {evt.created_at ? formatClinicalDate(evt.created_at) : 'Recorded'}
                  </p>
                  {evt.notes && (
                    <p className="text-slate-700 dark:text-slate-300 text-xs italic mt-0.5">
                      "{evt.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security and Governance Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>All clinical evaluations and decisions are permanently attributed and cryptographically logged for clinical governance.</span>
      </div>
    </div>
  );
}
