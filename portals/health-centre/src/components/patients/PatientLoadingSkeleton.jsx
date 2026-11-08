import React from 'react';

export function PatientLoadingSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading patient records">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-full max-w-sm mb-6" />
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="h-12 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 flex items-center justify-between">
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/4" />
          <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/6" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3 w-1/3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="space-y-2 w-full">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6 hidden sm:block" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6 hidden md:block" />
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading patient management data...</span>
    </div>
  );
}

export default PatientLoadingSkeleton;
