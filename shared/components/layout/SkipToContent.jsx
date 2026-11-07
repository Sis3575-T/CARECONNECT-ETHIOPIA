import React from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Accessible Skip to Content Link
 * Invisible by default, becomes visible when focused via Tab key.
 * Allows keyboard and screen reader users to skip sidebar navigation.
 */
export function SkipToContent({
  targetId = 'main-content',
  label = 'Skip to main clinical content',
  className
}) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50',
        'px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg',
        'ring-2 ring-white ring-offset-2 ring-offset-slate-900 focus:outline-none transition-all',
        className
      )}
    >
      {label}
    </a>
  );
}

export default SkipToContent;
