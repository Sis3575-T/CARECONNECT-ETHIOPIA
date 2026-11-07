import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn.js';

/**
 * CareConnect Ethiopia - Accessible Search Input
 * Features leading magnifying icon and quick clear button.
 */
export const SearchInput = forwardRef(function SearchInput(
  {
    value,
    defaultValue,
    onChange,
    onClear,
    placeholder = 'Search patients, referrals, facilities...',
    className,
    disabled = false,
    ...props
  },
  ref
) {
  const hasValue = Boolean(value);

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
        <Search className="w-4 h-4" />
      </div>

      <input
        ref={ref}
        type="search"
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'w-full text-sm rounded-xl pl-9 pr-9 py-2 transition-colors duration-150',
          'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100',
          'border border-slate-300 dark:border-slate-700',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none',
          disabled && 'bg-slate-50 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
        )}
        {...props}
      />

      {hasValue && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search query"
          className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

export default SearchInput;
