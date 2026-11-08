import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';

export default function ArrivalEmptyState({
  title = 'No patient arrivals in this queue',
  message = 'There are no accepted referrals currently scheduled or awaiting physical arrival for your hospital.',
  action = null
}) {
  return (
    <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3 shadow-xs">
        <Truck className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
