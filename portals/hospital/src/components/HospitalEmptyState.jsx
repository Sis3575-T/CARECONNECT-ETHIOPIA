import React from 'react';
import { Inbox } from 'lucide-react';

export default function HospitalEmptyState({
  icon: Icon = Inbox,
  title = 'No incoming referrals found',
  description = 'There are currently no referrals matching your filter criteria.',
  action,
  className = ''
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-8 text-center max-w-lg mx-auto my-6 shadow-xs ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
