import React from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Accessible SVG Loading Spinner
 */
export function Spinner({
  size = 'md',
  color = 'emerald',
  className,
  label = 'Loading...'
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    sky: 'text-sky-600 dark:text-sky-400',
    purple: 'text-purple-600 dark:text-purple-400',
    white: 'text-white',
    slate: 'text-slate-500'
  };

  return (
    <div role="status" className="inline-flex items-center justify-center">
      <svg
        className={cn(
          'animate-spin',
          sizeClasses[size] || sizeClasses.md,
          colorClasses[color] || colorClasses.emerald,
          className
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Spinner;
