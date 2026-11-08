import React from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Activity,
  FileText,
  AlertCircle,
  PlusCircle,
  CornerDownLeft,
  Share2,
  ShieldAlert
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import { OUTCOME_CATEGORIES } from './PatientOutcomeModal.jsx';

export function PatientOutcomeSection({
  referral,
  followUps = [],
  onOpenOutcomeModal
}) {
  if (!referral) return null;

  // Find any documented outcome events in followUps
  const outcomeEvents = followUps.filter(fu => {
    const o = (fu?.outcome || '').toUpperCase();
    return OUTCOME_CATEGORIES.some(cat => cat.value === o) || o.includes('OUTCOME') || o === 'DISCHARGE_DOCUMENTED';
  });

  const latestOutcomeEvent = outcomeEvents.length > 0 ? outcomeEvents[0] : null;

  // Determine current active outcome category
  const activeCategoryCode = latestOutcomeEvent?.outcome || referral.outcome_category || referral.outcome || referral.completion_reason;
  const categoryInfo = OUTCOME_CATEGORIES.find(c => c.value === activeCategoryCode);

  const isOutcomeRecorded = Boolean(latestOutcomeEvent || categoryInfo);

  return (
    <div className="space-y-6" data-testid="patient-outcome-section">
      {/* Outcome Status Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Patient Outcome Documentation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized clinical evaluation of patient health status following hospital referral intervention.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenOutcomeModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isOutcomeRecorded ? 'Update Clinical Outcome' : 'Document Outcome'}</span>
          </button>
        </div>

        {/* Current Outcome Card */}
        <div className="mt-5">
          {isOutcomeRecorded ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold block mb-1">
                    Documented Clinical Outcome
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        categoryInfo?.badgeClass || 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{categoryInfo?.label || activeCategoryCode}</span>
                    </span>
                  </div>
                </div>

                {latestOutcomeEvent && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Evaluated {formatRelativeTime(latestOutcomeEvent.created_at)}</span>
                  </span>
                )}
              </div>

              {/* Notes */}
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1">
                  Clinical Summary & Inpatient Course
                </span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {latestOutcomeEvent?.reason_or_notes || referral.outcome_notes || referral.notes || 'Outcome documented successfully.'}
                </p>
              </div>

              {/* Counter-Referral Notice if present */}
              {referral.counter_referral_instructions && (
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-sky-800 dark:text-sky-300 block">
                    Counter-Referral Instructions Transmitted to Health Centre:
                  </span>
                  <p className="text-sky-900 dark:text-sky-200">
                    {referral.counter_referral_instructions}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <Activity className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No Clinical Outcome Formally Documented
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Hospital policy requires attending clinical specialists to document a standardized clinical outcome category before closing the referral dossier.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenOutcomeModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Document Patient Outcome Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientOutcomeSection;
