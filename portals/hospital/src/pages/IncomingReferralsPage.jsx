import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  RefreshCw,
  X,
  Inbox,
  AlertCircle,
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { hospitalService } from '../services/hospitalService.js';
import HospitalReferralTable from '../components/HospitalReferralTable.jsx';
import HospitalDashboardSkeleton from '../components/HospitalDashboardSkeleton.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';
import HospitalEmptyState from '../components/HospitalEmptyState.jsx';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'New Incoming' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'INFO_REQUESTED', label: 'Info Requested' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Urgencies' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'ROUTINE', label: 'Routine' },
];

export default function IncomingReferralsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialPriority = searchParams.get('priority') || 'ALL';
  const initialSearch = searchParams.get('search') || '';
  const initialPage = parseInt(searchParams.get('page'), 10) || 1;

  const [referrals, setReferrals] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState(initialPriority);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [actionRequiredOnly, setActionRequiredOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const pageSize = 15;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch referrals from real backend API
  const fetchIncomingReferrals = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        limit: pageSize,
      };

      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (priorityFilter !== 'ALL') {
        params.priority = priorityFilter;
      }
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await hospitalService.getIncomingReferrals(params);
      let items = res.referrals || [];

      // Optional client-side action required filter
      if (actionRequiredOnly) {
        items = items.filter(r => {
          const s = (r.status || '').toUpperCase();
          return s === 'SUBMITTED' || s === 'PENDING' || s === 'ACKNOWLEDGED' || s === 'IN_REVIEW' || s === 'INFO_REQUESTED';
        });
      }

      setReferrals(items);
      setTotalCount(res.total || items.length);

      // Sync URL search params
      const newParams = new URLSearchParams();
      if (statusFilter !== 'ALL') newParams.set('status', statusFilter);
      if (priorityFilter !== 'ALL') newParams.set('priority', priorityFilter);
      if (debouncedSearch.trim()) newParams.set('search', debouncedSearch.trim());
      if (currentPage > 1) newParams.set('page', currentPage.toString());
      setSearchParams(newParams, { replace: true });
    } catch (err) {
      console.error('[IncomingReferralsPage] Fetch error:', err);
      setError(err?.message || 'Failed to retrieve incoming referrals from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, statusFilter, priorityFilter, debouncedSearch, actionRequiredOnly, setSearchParams]);

  useEffect(() => {
    fetchIncomingReferrals();
  }, [fetchIncomingReferrals]);

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSearchInput('');
    setDebouncedSearch('');
    setActionRequiredOnly(false);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const isFiltered = statusFilter !== 'ALL' || priorityFilter !== 'ALL' || debouncedSearch.trim() !== '' || actionRequiredOnly;

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-12">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Incoming Referral Inbox
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Authorized hospital intake queue: review clinical narratives, physiological vitals, and diagnostic files
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchIncomingReferrals(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Refresh referral queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by referral reference, patient name, origin health centre..."
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              aria-label="Search incoming referrals"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action Required Toggle */}
          <button
            onClick={() => {
              setActionRequiredOnly(!actionRequiredOnly);
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              actionRequiredOnly
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Action Required</span>
          </button>
        </div>

        {/* Dropdown Filters & Status Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgency Priority Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Urgency:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {PRIORITY_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-white">{referrals.length}</strong> of <strong className="text-slate-900 dark:text-white">{totalCount}</strong> incoming referrals
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <HospitalDashboardSkeleton />
      ) : error ? (
        <HospitalErrorState
          title="Could not load incoming referrals"
          message={error}
          onRetry={() => fetchIncomingReferrals()}
        />
      ) : referrals.length === 0 ? (
        <HospitalEmptyState
          icon={Inbox}
          title={isFiltered ? 'No matching incoming referrals' : 'Incoming referrals queue is empty'}
          description={
            isFiltered
              ? 'Try adjusting your search criteria or clearing selected status and urgency filters.'
              : 'Referrals dispatched from regional health centres to this hospital will appear in this workspace.'
          }
          action={
            isFiltered ? (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
          <HospitalReferralTable referrals={referrals} />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                Page <strong className="text-slate-900 dark:text-white">{currentPage}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
