import React from 'react';
import { Card } from '@shared/components/display/Card.jsx';

export function ReferralTrackingSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-4 animate-pulse" role="status" aria-label="Loading referrals">
      <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />

      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-20" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-16" />
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-64" />
            </div>

            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-24 shrink-0" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default ReferralTrackingSkeleton;
