import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function HospitalErrorState({
  title = 'Failed to load hospital workspace data',
  message = 'An unexpected error occurred while communicating with the CareConnect hospital API.',
  onRetry,
  className = ''
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-8 text-center max-w-xl mx-auto my-8 shadow-xs ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 mb-5 max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
