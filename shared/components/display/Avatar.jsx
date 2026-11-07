import React from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Avatar Component
 * Displays user initials with role or theme colored ring.
 */
export function Avatar({
  name = 'User',
  role,
  size = 'md',
  src,
  className
}) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'U';

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-xs font-bold',
    lg: 'w-11 h-11 text-sm font-bold'
  };

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl bg-gradient-to-tr from-slate-700 to-slate-900 text-white shadow-sm shrink-0 select-none overflow-hidden',
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      aria-label={name}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default Avatar;
