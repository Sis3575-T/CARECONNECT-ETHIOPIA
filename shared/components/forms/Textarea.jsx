import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Reusable Accessible Textarea
 */
export const Textarea = forwardRef(function Textarea(
  {
    id,
    name,
    label,
    value,
    defaultValue,
    onChange,
    rows = 3,
    placeholder,
    helperText,
    error,
    required = false,
    disabled = false,
    maxLength,
    className,
    textareaClassName,
    ...props
  },
  ref
) {
  const textareaId = id || (name ? `textarea-${name}` : undefined);
  const errorId = textareaId ? `${textareaId}-error` : undefined;
  const helperId = textareaId ? `${textareaId}-helper` : undefined;

  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
            {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        {maxLength && (
          <span className="text-[11px] text-slate-400">
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={cn(
          'w-full text-sm rounded-xl px-3.5 py-2.5 transition-colors duration-150 resize-y',
          'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
          'border placeholder:text-slate-400 dark:placeholder:text-slate-500',
          error
            ? 'border-rose-400 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
            : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20',
          disabled && 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800',
          'focus:outline-none',
          textareaClassName
        )}
        {...props}
      />

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

export default Textarea;
