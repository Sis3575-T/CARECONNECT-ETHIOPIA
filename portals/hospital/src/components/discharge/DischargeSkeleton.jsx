import React from 'react';

/**
 * CareConnect Ethiopia - Discharge & Outcome Loading Skeleton
 */
export function DischargeSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading discharge workspace data">
      {/* Metrics Header Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
            <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"></div>

      {/* Table Rows Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
              </div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
            </div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DischargeSkeleton;
