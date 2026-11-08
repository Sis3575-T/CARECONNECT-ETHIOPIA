import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Building,
  User
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { Select } from '@shared/components/forms/Select.jsx';

const GENDER_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Genders' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' }
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Lifecycle Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DECEASED', label: 'Deceased' },
  { value: 'MERGED', label: 'Merged' }
];

const REGION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Regions' },
  { value: 'Addis Ababa', label: 'Addis Ababa' },
  { value: 'Afar', label: 'Afar' },
  { value: 'Amhara', label: 'Amhara' },
  { value: 'Benishangul-Gumuz', label: 'Benishangul-Gumuz' },
  { value: 'Central Ethiopia', label: 'Central Ethiopia' },
  { value: 'Dire Dawa', label: 'Dire Dawa' },
  { value: 'Gambela', label: 'Gambela' },
  { value: 'Harari', label: 'Harari' },
  { value: 'Oromia', label: 'Oromia' },
  { value: 'Sidama', label: 'Sidama' },
  { value: 'Somali', label: 'Somali' },
  { value: 'South Ethiopia', label: 'South Ethiopia' },
  { value: 'Southwest Ethiopia', label: 'Southwest Ethiopia' },
  { value: 'Tigray', label: 'Tigray' }
];

export function PatientSearchFilter({
  searchTerm = '',
  onSearchChange,
  gender = 'ALL',
  onGenderChange,
  status = 'ALL',
  onStatusChange,
  region = 'ALL',
  onRegionChange,
  woreda = '',
  onWoredaChange,
  onReset,
  totalResults = 0,
  isLoading = false
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Sync internal state when prop changes
  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchTerm) {
        onSearchChange(localSearch);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, onSearchChange]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    gender !== 'ALL' ||
    status !== 'ALL' ||
    region !== 'ALL' ||
    Boolean(woreda);

  return (
    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Primary Search Bar Row */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search patients by Name, ETH-PAT ID, Fayda ID, MRN, or Phone..."
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-colors"
            autoComplete="off"
            aria-label="Search patients by identifier or name"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced((prev) => !prev)}
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters-panel"
            className={`inline-flex items-center gap-1.5 flex-1 sm:flex-initial justify-center ${
              showAdvanced || hasActiveFilters
                ? 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                : ''
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" aria-label="Filters active" />
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1"
              title="Reset all search filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filter Drawer */}
      {showAdvanced && (
        <div id="advanced-filters-panel" className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            options={GENDER_FILTER_OPTIONS}
          />

          <Select
            label="Record Status"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />

          <Select
            label="Administrative Region"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            options={REGION_FILTER_OPTIONS}
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Woreda Location
            </label>
            <input
              type="text"
              value={woreda}
              onChange={(e) => onWoredaChange(e.target.value)}
              placeholder="e.g. Woreda 03"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>
        </div>
      )}

      {/* Active Filter Pills Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium mr-1">Active Filters:</span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Query: "{searchTerm}"
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onSearchChange('');
                }}
                className="hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {gender !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Gender: {gender}
              <button
                type="button"
                onClick={() => onGenderChange('ALL')}
                className="hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {status !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Status: {status}
              <button
                type="button"
                onClick={() => onStatusChange('ALL')}
                className="hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {region !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Region: {region}
              <button
                type="button"
                onClick={() => onRegionChange('ALL')}
                className="hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {woreda && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              Woreda: {woreda}
              <button
                type="button"
                onClick={() => onWoredaChange('')}
                className="hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline ml-1 font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

export default PatientSearchFilter;
