import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  Building2,
  Bed,
  FileCheck,
  AlertCircle,
  Archive,
  User,
  Shield,
  Layers,
  ArrowUpDown,
  Filter,
  Share2,
  CornerDownLeft,
  LogOut,
  Award,
  Calendar
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export function DischargeHistoryTimeline({
  referral,
  followUps = [],
  reassignments = []
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'DISCHARGE' | 'TRANSFER' | 'OUTCOME'
  const [sortOrder, setSortOrder] = useState('DESC'); // 'DESC' | 'ASC'

  // Synthesize and normalize timeline events
  const allEvents = useMemo(() => {
    if (!referral) return [];
    const events = [];

    // 1. Referral Submission
    if (referral.submitted_at || referral.created_at) {
      events.push({
        id: 'evt-submitted',
        type: 'STATUS',
        category: 'Referral Initiation',
        title: 'Referral Created & Submitted',
        description: `Referral originated from ${referral.origin_facility?.name || referral.origin_facility_name || 'Primary Health Centre'}`,
        facility: referral.origin_facility?.name || referral.origin_facility_name,
        timestamp: referral.submitted_at || referral.created_at,
        icon: FileCheck,
        color: 'emerald'
      });
    }

    // 2. Physical Arrival / Admission
    if (referral.arrival_confirmed_at || referral.arrived_at) {
      events.push({
        id: 'evt-arrived',
        type: 'STATUS',
        category: 'Inpatient Placement',
        title: 'Patient Received & Admitted',
        description: `Admitted to ${referral.allocated_ward_department || 'General Inpatient'} (${referral.assigned_bed_type || 'Standard Bed'})`,
        facility: referral.destination_facility?.name || referral.destination_facility_name,
        timestamp: referral.arrival_confirmed_at || referral.arrived_at,
        icon: Bed,
        color: 'indigo'
      });
    }

    // 3. Reassignments (Inter-Facility Transfers)
    if (Array.isArray(reassignments)) {
      reassignments.forEach((r, idx) => {
        events.push({
          id: `evt-reassign-${idx}-${r.id || idx}`,
          type: 'TRANSFER',
          category: 'Inter-Facility Transfer',
          title: `Transferred to Facility #${r.new_facility_id}`,
          description: `Reason: ${r.reassignment_reason || 'Clinical Escalation'}. Notes: ${r.reassignment_notes || 'Patient transferred'}`,
          actor: r.reassigned_by_user_id ? `Staff #${r.reassigned_by_user_id}` : 'Attending Clinician',
          timestamp: r.created_at || r.reassigned_at || new Date().toISOString(),
          icon: Share2,
          color: 'purple'
        });
      });
    }

    // 4. Follow-Up events (Discharge, Outcomes, Counter-Referrals, Progress)
    if (Array.isArray(followUps)) {
      followUps.forEach((fu, idx) => {
        const out = (fu.outcome || '').toUpperCase();
        let cat = 'Clinical Event';
        let iconComp = Clock;
        let colorTheme = 'slate';
        let eventType = 'PROGRESS';

        if (out === 'DISCHARGE_DOCUMENTED' || out === 'DISCHARGED') {
          cat = 'Hospital Discharge';
          iconComp = LogOut;
          colorTheme = 'emerald';
          eventType = 'DISCHARGE';
        } else if (out === 'RETURNED_TO_REFERRING_FACILITY' || out.includes('COUNTER_REFERRAL')) {
          cat = 'Counter-Referral';
          iconComp = CornerDownLeft;
          colorTheme = 'sky';
          eventType = 'TRANSFER';
        } else if (out === 'INTER_FACILITY_TRANSFER') {
          cat = 'Inter-Facility Transfer';
          iconComp = Share2;
          colorTheme = 'purple';
          eventType = 'TRANSFER';
        } else if (out.includes('OUTCOME') || out === 'CLINICALLY_IMPROVED' || out === 'STABILIZED' || out === 'DECEASED' || out === 'SELF_DISCHARGED') {
          cat = 'Patient Outcome Evaluation';
          iconComp = Award;
          colorTheme = 'amber';
          eventType = 'OUTCOME';
        } else if (out.includes('DEPARTMENT')) {
          cat = 'Department Assignment';
          iconComp = Layers;
          colorTheme = 'indigo';
          eventType = 'PROGRESS';
        }

        events.push({
          id: `evt-fu-${idx}-${fu.id || idx}`,
          type: eventType,
          category: cat,
          title: fu.outcome?.replace(/_/g, ' ') || 'Coordination Update',
          description: fu.reason_or_notes || fu.notes || 'Note recorded',
          actor: fu.created_by_user_id ? `Clinician #${fu.created_by_user_id}` : 'Care Team',
          timestamp: fu.created_at,
          icon: iconComp,
          color: colorTheme
        });
      });
    }

    // Sort chronologically
    events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return sortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
    });

    return events;
  }, [referral, followUps, reassignments, sortOrder]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return allEvents;
    return allEvents.filter(e => e.type === filterType);
  }, [allEvents, filterType]);

  const getColorClasses = (color) => {
    switch (color) {
      case 'emerald':
        return {
          icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-4 ring-emerald-50 dark:ring-emerald-950/20',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
        };
      case 'purple':
        return {
          icon: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-4 ring-purple-50 dark:ring-purple-950/20',
          badge: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
        };
      case 'sky':
        return {
          icon: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 ring-4 ring-sky-50 dark:ring-sky-950/20',
          badge: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
        };
      case 'amber':
        return {
          icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-4 ring-amber-50 dark:ring-amber-950/20',
          badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
        };
      case 'indigo':
        return {
          icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 ring-4 ring-indigo-50 dark:ring-indigo-950/20',
          badge: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
        };
      default:
        return {
          icon: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-4 ring-slate-100 dark:ring-slate-800',
          badge: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6" data-testid="discharge-history-timeline">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Chronological Care, Transfer & Outcome Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable longitudinal record of admission, progress milestones, transfers, counter-referrals, and discharge authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Events ({allEvents.length})</option>
            <option value="DISCHARGE">Discharges</option>
            <option value="TRANSFER">Transfers & Returns</option>
            <option value="OUTCOME">Clinical Outcomes</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={sortOrder === 'DESC' ? 'Newest first' : 'Oldest first'}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No events match the selected timeline filter.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredEvents.map((event) => {
            const Icon = event.icon;
            const theme = getColorClasses(event.color);

            return (
              <div key={event.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1 p-1.5 rounded-full z-10 transition-transform group-hover:scale-110 ${theme.icon}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Event Card */}
                <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${theme.badge}`}>
                        {event.category}
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                        {event.title}
                      </strong>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatClinicalDate(event.timestamp)} ({formatRelativeTime(event.timestamp)})
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    {event.actor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{event.actor}</span>
                      </span>
                    )}
                    {event.facility && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        <span>{event.facility}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DischargeHistoryTimeline;
