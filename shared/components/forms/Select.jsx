import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Select Dropdown
 */
export const Select = forwardRef(function Select(
  {
    id,
    name,
    label,
    value,
    defaultValue,
    onChange,
    options = [],
    placeholder = 'Select an option',
    helperText,
    error,
    required = false,
    disabled = false,
    className,
    selectClassName,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (name ? `select-${name}` : undefined);
  const errorId = selectId ? `${selectId}-error` : undefined;
  const helperId = selectId ? `${selectId}-helper` : undefined;

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full text-sm rounded-xl pl-3.5 pr-10 py-2 transition-colors duration-150 appearance-none',
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
            'border',
            error
              ? 'border-rose-400 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20',
            disabled && 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800',
            'focus:outline-none',
            selectClassName
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children || options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="absolute right-3 text-slate-400 pointer-events-none flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Select;
