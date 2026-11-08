import React from 'react';
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Layers,
  PlusCircle,
  User,
  ShieldCheck,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export function CareProgressWorkspace({
  referral,
  followUps = [],
  onOpenProgressModal,
  onOpenAssignModal,
  disabled = false
}) {
  if (!referral) return null;

  const statusKey = String(referral.status || '').toUpperCase();
  const isArrived = statusKey === 'PATIENT_ARRIVED' || statusKey === 'ARRIVED';
  const isInProgress = statusKey === 'IN_PROGRESS';
  const isCompleted = statusKey === 'COMPLETED';
  const isClosed = statusKey === 'CLOSED';

  // Outstanding Actions Checklist
  const hasDepartment = Boolean(referral.allocated_ward_department && referral.allocated_ward_department !== 'Unassigned');
  const hasBed = Boolean(referral.assigned_bed_type);
  const isAdmitted = isInProgress || isCompleted || isClosed;
  const hasProgressNotes = Boolean(referral.current_progress_notes || followUps.length > 0);

  const checklist = [
    { label: 'Patient Physical Arrival Verified', complete: isArrived || isAdmitted, desc: 'Triage bay registration confirmed' },
    { label: 'Department & Bed Allocation', complete: hasDepartment && hasBed, desc: referral.allocated_ward_department || 'Needs assignment' },
    { label: 'Inpatient Ward Admission', complete: isAdmitted, desc: isAdmitted ? 'In active inpatient care' : 'Pending ward placement' },
    { label: 'Care Progress Documentation', complete: hasProgressNotes, desc: `${followUps.length} milestone notes logged` }
  ];

  return (
    <div className="space-y-6" data-testid="care-progress-workspace">
      {/* Top Banner: Outstanding Coordination Checklist */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Inpatient Care Readiness & Actions Checklist</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {checklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                item.complete
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
              }`}
            >
              {item.complete ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">{item.label}</span>
                <span className="text-2xs opacity-80 mt-0.5 block">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Timeline Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Care Progress Stream & Coordination History</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chronological log of clinical milestones, cross-department consults, and operational updates.
            </p>
          </div>

          {!isClosed && onOpenProgressModal && (
            <button
              type="button"
              onClick={onOpenProgressModal}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Care Progress</span>
            </button>
          )}
        </div>

        {/* Current State Highlight */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Current Status in {referral.allocated_ward_department || 'Inpatient Service'}</span>
            </span>
            <span className="text-slate-400">Latest Recorded Note</span>
          </div>
          <p className="text-xs text-slate-800 dark:text-slate-200 mt-2 leading-relaxed">
            {referral.current_progress_notes || 'Patient admitted into inpatient service. Specialist evaluation and daily rounds in progress.'}
          </p>
        </div>

        {/* Progress List */}
        {followUps.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
            No additional progress events logged for this referral yet. Click "Record Care Progress" above to log a milestone or consult.
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {followUps.map((item, idx) => {
              const outcome = item.outcome || item.interaction_type || 'Care Update';
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-2xs">
                      {outcome.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400 text-2xs">
                      {item.created_at || item.attempted_at ? formatClinicalDate(item.created_at || item.attempted_at, true) : 'Logged'}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item.reason_or_notes || item.notes || 'Progress recorded'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CareProgressWorkspace;
