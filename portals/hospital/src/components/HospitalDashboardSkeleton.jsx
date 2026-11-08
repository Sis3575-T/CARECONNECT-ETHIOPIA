import React from 'react';

export default function HospitalDashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-pulse" role="status" aria-label="Loading hospital dashboard">
      {/* Title skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-10 w-36 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700"></div>
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded"></div>
              <div className="h-6 w-12 bg-slate-200 dark:bg-slate-600 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(row => (
              <div key={row} className="h-14 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800"></div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-48 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}
