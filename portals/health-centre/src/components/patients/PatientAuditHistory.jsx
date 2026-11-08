import React from 'react';
import { History, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Badge } from '@shared/components/display/Badge.jsx';
import { formatClinicalDate } from '@shared/utils/formatters.js';

export function PatientAuditHistory({ corrections = [], duplicateReviews = [] }) {
  const hasHistory = corrections.length > 0 || duplicateReviews.length > 0;

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <History className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          Record Correction & Clinical Governance Audit Trail
        </h3>
      </div>

      {!hasHistory ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No demographic corrections or duplicate review actions have been recorded for this patient.
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {/* Demographic Corrections */}
          {corrections.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Demographic Corrections ({corrections.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                {corrections.map((corr, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Field Corrected: <code className="text-sky-600">{corr.field_name}</code>
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatClinicalDate(corr.created_at, true)}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      Reason: <span className="italic">{corr.reason || 'Correction requested by clinician'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Changed from <span className="line-through">{String(corr.old_value ?? 'none')}</span> to{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{String(corr.new_value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Reviews */}
          {duplicateReviews.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                Duplicate Review Decisions ({duplicateReviews.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                {duplicateReviews.map((rev, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Outcome: <Badge variant={rev.review_status === 'CONFIRMED_MATCH' ? 'danger' : rev.review_status === 'FALSE_POSITIVE' ? 'success' : 'warning'}>{rev.review_status}</Badge>
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {formatClinicalDate(rev.created_at, true)}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      Candidate Record: <code className="text-slate-800 dark:text-slate-200 font-bold">{rev.candidate_patient_id}</code>
                    </div>
                    {rev.notes && (
                      <div className="text-[11px] text-slate-500 italic">
                        Clinician Notes: "{rev.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default PatientAuditHistory;
