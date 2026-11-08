import React from 'react';

export default function ArrivalSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 space-y-2">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-7 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Table / Card Skeleton */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 space-y-4">
        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700/60"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
