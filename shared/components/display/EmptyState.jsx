import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';

/**
 * CareConnect Ethiopia - Reusable Accessible Empty State Component
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are currently no items matching your criteria in this view.',
  actionLabel,
  onAction,
  className
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3.5">
        <Icon className="w-6 h-6 stroke-[1.75]" aria-hidden="true" />
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h4>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
