import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Checkbox
 */
export const Checkbox = forwardRef(function Checkbox(
  {
    id,
    name,
    label,
    checked,
    defaultChecked,
    onChange,
    disabled = false,
    helperText,
    error,
    className,
    ...props
  },
  ref
) {
  const checkboxId = id || (name ? `checkbox-${name}` : undefined);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={checkboxId}
        className={cn(
          'inline-flex items-start gap-2.5 select-none cursor-pointer',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={checkboxId}
            name={name}
            type="checkbox"
            checked={checked}
            defaultChecked={defaultChecked}
            onChange={onChange}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-4 h-4 rounded-md border transition-all duration-150 flex items-center justify-center',
              'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800',
              'peer-checked:bg-emerald-600 peer-checked:border-emerald-600 dark:peer-checked:bg-emerald-500',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/30',
              error && 'border-rose-400'
            )}
            aria-hidden="true"
          >
            <Check className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
          </div>
        </div>

        {label && (
          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {label}
            {helperText && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                {helperText}
              </p>
            )}
          </div>
        )}
      </label>

      {error && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium pl-6">
          {error}
        </p>
      )}
    </div>
  );
});

export default Checkbox;
