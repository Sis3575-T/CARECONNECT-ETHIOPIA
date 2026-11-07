import React from 'react';
import { cn } from '../../utils/cn.js';
import { TRIAGE_PRIORITIES } from '../../constants/triage.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Badge Component
 * Supports variants: triage (EMERGENCY, URGENT, PRIORITY, ROUTINE),
 * status (success, warning, error, info, neutral), outline, and solid.
 */

const variantStyles = {
  // Status Variants
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  error: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
};

export function Badge({
  children,
  variant = 'neutral',
  triage,
  size = 'md',
  dot = false,
  className,
  ...props
}) {
  let style = variantStyles[variant] || variantStyles.neutral;
  let dotColor = 'bg-slate-500';

  if (triage) {
    const meta = TRIAGE_PRIORITIES[String(triage).toUpperCase()];
    if (meta) {
      style = meta.badgeColor;
      dotColor = meta.dotColor;
    }
  }

  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border tracking-wide select-none',
        sizeStyle,
        style,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
