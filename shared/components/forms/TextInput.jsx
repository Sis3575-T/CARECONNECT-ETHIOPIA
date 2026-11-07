import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Text Input
 * Includes label, hint, error message, leading/trailing icons, and focus ring.
 */
export const TextInput = forwardRef(function TextInput(
  {
    id,
    name,
    label,
    type = 'text',
    value,
    defaultValue,
    onChange,
    placeholder,
    helperText,
    error,
    required = false,
    disabled = false,
    readOnly = false,
    leftIcon,
    rightIcon,
    className,
    inputClassName,
    autoComplete,
    ...props
  },
  ref
) {
  const inputId = id || (name ? `input-${name}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full text-sm rounded-xl px-3.5 py-2 transition-colors duration-150',
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
            'border placeholder:text-slate-400 dark:placeholder:text-slate-500',
            leftIcon ? 'pl-9' : 'pl-3.5',
            rightIcon ? 'pr-9' : 'pr-3.5',
            error
              ? 'border-rose-400 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20',
            disabled && 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800',
            'focus:outline-none',
            inputClassName
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-slate-400 dark:text-slate-500 flex items-center">
            {rightIcon}
          </div>
        )}
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

export default TextInput;
