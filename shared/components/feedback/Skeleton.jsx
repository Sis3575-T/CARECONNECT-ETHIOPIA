import React from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Accessible Animated Skeleton Loader
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className
}) {
  const variantStyles = {
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    text: 'rounded-md h-4'
  };

  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={cn(
        'animate-pulse bg-slate-200 dark:bg-slate-700/60 select-none',
        variantStyles[variant] || variantStyles.rectangular,
        className
      )}
    />
  );
}

export default Skeleton;
