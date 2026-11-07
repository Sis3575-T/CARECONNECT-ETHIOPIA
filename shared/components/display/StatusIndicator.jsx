import React from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Animated Real-Time Status Indicator
 * Indicates live WebSocket connection, facility online state, or vehicle movement.
 */

const statusColors = {
  online: 'bg-emerald-500',
  busy: 'bg-amber-500',
  offline: 'bg-slate-400',
  connecting: 'bg-sky-500',
  error: 'bg-rose-500'
};

export function StatusIndicator({
  status = 'online',
  label,
  pulse = true,
  size = 'md',
  className
}) {
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const color = statusColors[status] || statusColors.online;

  return (
    <div className={cn('inline-flex items-center gap-2 select-none', className)}>
      <span className="relative flex shrink-0">
        {pulse && status === 'online' && (
          <span
            className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)}
            aria-hidden="true"
          />
        )}
        <span className={cn('relative inline-flex rounded-full', dotSize, color)} aria-hidden="true" />
      </span>

      {label && (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
      )}
    </div>
  );
}

export default StatusIndicator;
