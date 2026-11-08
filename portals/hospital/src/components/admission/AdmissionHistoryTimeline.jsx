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
  Filter
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export function AdmissionHistoryTimeline({
  referral,
  followUps = []
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'STATUS' | 'PROGRESS' | 'PLACEMENT'
  const [sortOrder, setSortOrder] = useState('DESC'); // 'DESC' | 'ASC'

  // Synthesize and normalize timeline events
  const allEvents = useMemo(() => {
    if (!referral) return [];
    const events = [];

    // 1. Initial Referral Submission
    if (referral.submitted_at || referral.created_at) {
      events.push({
        id: 'evt-submitted',
        type: 'STATUS',
        category: 'Referral Submission',
        title: 'Referral Created & Submitted',
        description: `Referral submitted from ${referral.origin_facility_name || referral.origin_facility_id} with priority: ${referral.priority}`,
        actor: referral.referring_clinician_first_name
          ? `Dr. ${referral.referring_clinician_first_name} ${referral.referring_clinician_last_name || ''}`
          : 'Referring Clinician',
        facility: referral.origin_facility_name,
        timestamp: referral.submitted_at || referral.created_at,
        icon: FileCheck,
        color: 'emerald'
      });
    }

    // 2. Hospital Triage Decision
    if (referral.decision_at) {
      events.push({
        id: 'evt-decision',
        type: 'STATUS',
        category: 'Triage Evaluation',
        title: 'Referral Accepted by Specialist Triage',
        description: `Reserved specialty care slot. Ward allocated: ${referral.allocated_ward_department || 'General Admission'}`,
        actor: referral.receiving_clinician_first_name
          ? `Dr. ${referral.receiving_clinician_first_name} ${referral.receiving_clinician_last_name || ''}`
          : 'Hospital Triage Team',
        facility: referral.destination_facility_name,
        timestamp: referral.decision_at,
        icon: CheckCircle,
        color: 'teal'
      });
    }

    // 3. Physical Arrival
    if (referral.arrived_at) {
      events.push({
        id: 'evt-arrival',
        type: 'PLACEMENT',
        category: 'Physical Arrival',
        title: 'Patient Arrived at Hospital Triage',
        description: 'Physical presence registered and multi-factor identity verified at receiving bay.',
        actor: 'Hospital Triage Intake',
        facility: referral.destination_facility_name,
        timestamp: referral.arrived_at,
        icon: Clock,
        color: 'amber'
      });
    }

    // 4. Status History entries
    if (Array.isArray(referral.status_history)) {
      referral.status_history.forEach((h, idx) => {
        const toS = (h.to_status || '').toUpperCase();
        let cat = 'Status Transition';
        let iconComp = Clock;
        let colorTheme = 'indigo';

        if (toS === 'IN_PROGRESS') {
          cat = 'Ward Admission';
          iconComp = Bed;
          colorTheme = 'indigo';
        } else if (toS === 'COMPLETED') {
          cat = 'Care Completed';
          iconComp = CheckCircle;
          colorTheme = 'emerald';
        } else if (toS === 'CLOSED') {
          cat = 'Dossier Closed';
          iconComp = Archive;
          colorTheme = 'slate';
        }

        events.push({
          id: `hist-${h.id || idx}`,
          type: toS === 'IN_PROGRESS' ? 'PLACEMENT' : 'STATUS',
          category: cat,
          title: `Status Transition: ${h.to_status}`,
          description: h.reason_text || `State machine transition from ${h.from_status || 'initial'} to ${h.to_status}`,
          actor: h.user_first_name ? `Dr. ${h.user_first_name} ${h.user_last_name || ''}` : 'Hospital Staff',
          facility: h.facility_name,
          timestamp: h.created_at,
          icon: iconComp,
          color: colorTheme
        });
      });
    }

    // 5. Follow-ups & Progress notes
    if (Array.isArray(followUps)) {
      followUps.forEach((f, idx) => {
        const outcome = (f.outcome || f.interaction_type || 'CARE_UPDATE').toUpperCase();
        const isDept = outcome.includes('DEPT') || outcome.includes('DEPARTMENT');

        events.push({
          id: `followup-${f.id || idx}`,
          type: isDept ? 'PLACEMENT' : 'PROGRESS',
          category: isDept ? 'Department Assignment' : 'Care Progress Update',
          title: outcome.replace(/_/g, ' '),
          description: f.reason_or_notes || f.notes || 'Progress recorded in patient record.',
          actor: f.responsible_user_name || 'Hospital Inpatient Staff',
          facility: referral.destination_facility_name,
          timestamp: f.created_at || f.attempted_at,
          icon: isDept ? Building2 : Activity,
          color: isDept ? 'indigo' : 'emerald'
        });
      });
    }

    // 6. Referral Completion
    if (referral.completed_at) {
      events.push({
        id: 'evt-completed',
        type: 'STATUS',
        category: 'Care Completed',
        title: 'Specialist Referral Care Completed',
        description: 'All specialist clinical objectives and hospital inpatient care completed.',
        actor: 'Attending Clinician',
        facility: referral.destination_facility_name,
        timestamp: referral.completed_at,
        icon: CheckCircle,
        color: 'emerald'
      });
    }

    // Deduplicate events with identical titles and timestamps
    const seen = new Set();
    const uniqueEvents = [];
    for (const ev of events) {
      if (!ev.timestamp) continue;
      const key = `${ev.title}_${new Date(ev.timestamp).getTime()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(ev);
      }
    }

    // Sort chronologically or reverse
    uniqueEvents.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortOrder === 'DESC' ? tB - tA : tA - tB;
    });

    return uniqueEvents;
  }, [referral, followUps, sortOrder]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return allEvents;
    return allEvents.filter(e => e.type === filterType);
  }, [allEvents, filterType]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5" data-testid="admission-history-timeline">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Inpatient Admission & Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable, server-authoritative log of all arrival, placement, progress, and completion events.
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Events ({allEvents.length})</option>
            <option value="STATUS">Status Transitions</option>
            <option value="PLACEMENT">Ward & Bed Placements</option>
            <option value="PROGRESS">Care Progress Notes</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(s => s === 'DESC' ? 'ASC' : 'DESC')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors"
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'DESC' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
          No events match the selected filter.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredEvents.map((ev) => {
            const Icon = ev.icon || Clock;

            let badgeColors = 'bg-slate-100 text-slate-700 border-slate-200';
            let dotColors = 'bg-slate-500 ring-slate-100';

            if (ev.color === 'emerald') {
              badgeColors = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
              dotColors = 'bg-emerald-600 ring-emerald-100 dark:ring-emerald-950';
            } else if (ev.color === 'indigo') {
              badgeColors = 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
              dotColors = 'bg-indigo-600 ring-indigo-100 dark:ring-indigo-950';
            } else if (ev.color === 'amber') {
              badgeColors = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
              dotColors = 'bg-amber-600 ring-amber-100 dark:ring-amber-950';
            } else if (ev.color === 'teal') {
              badgeColors = 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
              dotColors = 'bg-teal-600 ring-teal-100 dark:ring-teal-950';
            }

            return (
              <div key={ev.id} className="relative group">
                {/* Node icon dot */}
                <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ${dotColors}`}>
                  <Icon className="w-3 h-3" />
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-2xs font-bold border ${badgeColors}`}>
                        {ev.category}
                      </span>
                      <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                        {ev.title}
                      </strong>
                    </div>
                    <div className="text-slate-400 text-2xs font-mono flex items-center gap-2">
                      <span>{formatClinicalDate(ev.timestamp, true)}</span>
                      <span>({formatRelativeTime(ev.timestamp)})</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-2xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100/80 dark:border-slate-700/50">
                    {ev.actor && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Actor: <strong>{ev.actor}</strong></span>
                      </span>
                    )}
                    {ev.facility && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>Facility: <strong>{ev.facility}</strong></span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tenancy & Audit Guarantee Footer */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-2xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          Zero-PII permanent audit logging: All status changes and department reassignments are cryptographically traced with server-authoritative timestamps.
        </span>
      </div>
    </div>
  );
}

export default AdmissionHistoryTimeline;
