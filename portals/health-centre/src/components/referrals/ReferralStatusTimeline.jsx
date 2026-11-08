import React from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  PhoneCall,
  ArrowRightLeft,
  ShieldAlert,
  Building2,
  User,
  Activity,
  History
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

function getEventIcon(eventType, status) {
  if (eventType === 'STATUS_TRANSITION') {
    switch (status) {
      case 'ACCEPTED':
        return { icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' };
      case 'REJECTED':
        return { icon: XCircle, bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' };
      case 'ACKNOWLEDGED':
        return { icon: CheckCircle2, bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400' };
      case 'IN_TRANSIT':
      case 'ARRIVED':
        return { icon: Activity, bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400' };
      default:
        return { icon: Clock, bg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400' };
    }
  }

  if (eventType === 'DECISION') {
    return { icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' };
  }

  if (eventType === 'INFORMATION_REQUEST' || eventType === 'INFO_REQUEST') {
    return { icon: AlertTriangle, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' };
  }

  if (eventType === 'INFORMATION_RESPONSE') {
    return { icon: FileText, bg: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400' };
  }

  if (eventType === 'FOLLOW_UP') {
    return { icon: PhoneCall, bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400' };
  }

  if (eventType === 'REASSIGNMENT') {
    return { icon: ArrowRightLeft, bg: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400' };
  }

  if (eventType === 'ESCALATION') {
    return { icon: ShieldAlert, bg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' };
  }

  return { icon: History, bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
}

export function ReferralStatusTimeline({
  timelineEvents = [],
  loading = false,
  error = null
}) {
  if (loading) {
    return (
      <Card className="p-6 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Spinner size="sm" className="mx-auto mb-2 text-sky-600" />
        <p className="text-xs text-slate-500">Querying verifiable timeline audit events...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
        {error}
      </div>
    );
  }

  if (timelineEvents.length === 0) {
    return (
      <Card className="p-6 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Clock className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
        <p>No historical coordination transitions recorded yet.</p>
        <span className="text-[11px] text-slate-400 block mt-0.5">
          Events are immutably logged as the receiving hospital triages this referral.
        </span>
      </Card>
    );
  }

  // Sort events chronologically (oldest to newest or newest to oldest)
  const sorted = [...timelineEvents].sort(
    (a, b) => new Date(b.timestamp || b.created_at) - new Date(a.timestamp || a.created_at)
  );

  return (
    <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <History className="w-4 h-4 text-sky-600" />
          <span>Chronological Referral Timeline ({sorted.length} Events)</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">Immutable Audit Trail</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {sorted.map((ev, index) => {
          const { icon: EventIcon, bg: iconBg } = getEventIcon(ev.event_type || ev.type, ev.status);
          const eventDate = ev.timestamp || ev.created_at;

          const title =
            ev.title ||
            ev.event_name ||
            (ev.event_type === 'STATUS_TRANSITION'
              ? `Status changed to ${ev.status || 'SUBMITTED'}`
              : ev.event_type === 'DECISION'
              ? `Hospital Decision: ${ev.decision || ev.status || 'Reviewed'}`
              : ev.event_type === 'INFORMATION_REQUEST'
              ? 'Additional Clinical Information Requested'
              : ev.event_type === 'INFORMATION_RESPONSE'
              ? 'Health Centre Information Response Provided'
              : ev.event_type === 'FOLLOW_UP'
              ? `Follow-up Recorded: ${ev.communication_channel || 'Coordination'}`
              : ev.event_type === 'REASSIGNMENT'
              ? 'Referral Reassigned to New Facility'
              : ev.event_type === 'ESCALATION'
              ? 'Operational Escalation Triggered'
              : 'Referral Lifecycle Event');

          const actor =
            ev.actor_name ||
            ev.created_by_name ||
            ev.responsible_party ||
            (ev.user_role ? `${ev.user_role} (${ev.facility_name || 'Staff'})` : null);

          const notes = ev.notes || ev.reason || ev.comment || ev.response_notes || ev.requested_information;

          return (
            <div key={ev.id || `${eventDate}-${index}`} className="relative group text-xs">
              {/* Event Icon Pin */}
              <div
                className={`absolute -left-6 top-0 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${iconBg}`}
                aria-hidden="true"
              >
                <EventIcon className="w-3 h-3" />
              </div>

              {/* Event Details */}
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {title}
                  </h4>
                  <time className="text-[11px] text-slate-400 whitespace-nowrap">
                    {formatClinicalDate(eventDate)} • {formatRelativeTime(eventDate)}
                  </time>
                </div>

                {actor && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Actor: {actor}</span>
                  </div>
                )}

                {notes && (
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed mt-1.5 whitespace-pre-wrap">
                    {notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default ReferralStatusTimeline;
