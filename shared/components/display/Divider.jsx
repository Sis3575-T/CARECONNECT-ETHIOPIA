import React from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Divider Component
 */
export function Divider({
  orientation = 'horizontal',
  label,
  className
}) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn('w-px h-full bg-slate-200 dark:bg-slate-700/80 my-auto shrink-0', className)}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div className={cn('relative flex items-center w-full my-4', className)} role="separator">
        <div className="flex-grow border-t border-slate-200 dark:border-slate-700/80" />
        <span className="flex-shrink mx-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-grow border-t border-slate-200 dark:border-slate-700/80" />
      </div>
    );
  }

  return (
    <hr
      className={cn('w-full border-0 border-t border-slate-200 dark:border-slate-700/80 my-4', className)}
      role="separator"
    />
  );
}

export default Divider;
