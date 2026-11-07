import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Button Component
 * Supports variants: primary, secondary, outline, ghost, destructive.
 * Supports sizes: sm, md, lg.
 * Supports loading state with accessible announcement and disabled states.
 */

const variantClasses = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent focus-visible:ring-emerald-500 active:bg-emerald-800 dark:bg-emerald-500 dark:hover:bg-emerald-600',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 focus-visible:ring-slate-400 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 dark:border-slate-700',
  outline: 'bg-transparent hover:bg-slate-50 text-slate-700 border border-slate-300 focus-visible:ring-slate-400 active:bg-slate-100 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-800',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent focus-visible:ring-slate-400 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800',
  destructive: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-transparent focus-visible:ring-rose-500 active:bg-rose-800 dark:bg-rose-600 dark:hover:bg-rose-700'
};

const sizeClasses = {
  sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-3.5 py-2 text-sm rounded-xl gap-2 font-medium',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5 font-semibold'
};

export const Button = forwardRef(function Button(
  {
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    disabled = false,
    leftIcon,
    rightIcon,
    className,
    onClick,
    'aria-label': ariaLabel,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        'inline-flex items-center justify-center select-none transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none shadow-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
