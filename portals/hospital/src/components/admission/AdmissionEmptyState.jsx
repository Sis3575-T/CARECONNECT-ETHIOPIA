import React from 'react';
import { BedDouble, RotateCcw } from 'lucide-react';

/**
 * CareConnect Ethiopia - Admission Empty State
 */
export function AdmissionEmptyState({
  title = 'No admissions found',
  message = 'There are no inpatient admissions matching the selected filters or search criteria.',
  onReset,
  resetLabel = 'Reset Filters'
}) {
  return (
    <div
      className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"
      data-testid="admission-empty-state"
    >
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
        <BedDouble className="w-8 h-8" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">{message}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{resetLabel}</span>
        </button>
      )}
    </div>
  );
}

export default AdmissionEmptyState;
