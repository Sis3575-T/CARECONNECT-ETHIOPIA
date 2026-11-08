import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Building2,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { referralTrackingService } from '../services/referralTrackingService.js';
import { ReferralTrackingTable } from '../components/referrals/ReferralTrackingTable.jsx';
import { ReferralTrackingSkeleton } from '../components/referrals/ReferralTrackingSkeleton.jsx';
import { ReferralTrackingErrorState } from '../components/referrals/ReferralTrackingErrorState.jsx';
import { ReferralTrackingEmptyState } from '../components/referrals/ReferralTrackingEmptyState.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Card } from '@shared/components/display/Card.jsx';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUBMITTED', label: 'Submitted / Pending Triage' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'ACCEPTED', label: 'Accepted by Hospital' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'INFO_REQUESTED', label: 'Info Requested' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'ARRIVED', label: 'Patient Arrived' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

const PRIORITY_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Urgencies' },
  { value: 'EMERGENCY', label: 'Emergency Priority' },
  { value: 'URGENT', label: 'Urgent Priority' },
  { value: 'ROUTINE', label: 'Routine Priority' }
];

export default function AllReferralsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const facilityName = user?.facilityName || 'Assigned Health Centre';

  // Server Query State
  const [referrals, setReferrals] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [actionOnly, setActionOnly] = useState(false);

  // Request State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  const debounceTimerRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 350);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  const fetchReferrals = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        priority: priorityFilter !== 'ALL' ? priorityFilter : undefined
      };

      const res = await referralTrackingService.getReferrals(params);

      const items = res?.data?.referrals || res?.data?.items || res?.referrals || res?.items || (Array.isArray(res?.data) ? res.data : []);
      const total = res?.data?.total || res?.total || items.length;

      let filteredItems = items;
      if (actionOnly) {
        filteredItems = filteredItems.filter(
          (r) => r.status === 'INFO_REQUESTED' || r.has_pending_info_request || r.priority === 'EMERGENCY'
        );
      }

      setReferrals(filteredItems);
      setTotalCount(total);
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err) {
      setError(err.message || 'Failed to retrieve referral records.');
      setStatusCode(err.status || err.statusCode || 500);
      setReferrals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [page, limit, debouncedSearch, statusFilter, priorityFilter, actionOnly]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setActionOnly(false);
    setPage(1);
  };

  const handleExportCSV = () => {
    if (referrals.length === 0) return;
    const headers = ['Referral Reference', 'Patient Name', 'Gender', 'Age', 'Destination Hospital', 'Specialty', 'Priority', 'Status', 'Date'];
    const rows = referrals.map((r) => [
      `"${r.reference_number || r.id}"`,
      `"${r.patient_name || r.patient_full_name || 'Patient'}"`,
      `"${r.patient_gender || ''}"`,
      r.patient_age || '',
      `"${r.destination_facility_name || r.receivingFacility || ''}"`,
      `"${r.required_specialty || r.service || ''}"`,
      r.priority || 'ROUTINE',
      r.status || 'SUBMITTED',
      r.created_at || new Date().toISOString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_referrals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters = Boolean(
    debouncedSearch || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || actionOnly
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 py-4">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Referrals Tracking & Follow-up Workspace</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor hospital triage outcomes, clinical timelines, and coordination requests for{' '}
            <strong className="text-slate-700 dark:text-slate-300">{facilityName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchReferrals(true)}
            disabled={loading || refreshing}
            className="text-xs inline-flex items-center gap-1.5"
            aria-label="Refresh referral data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={referrals.length === 0}
            className="text-xs inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/create-referral')}
            className="text-xs inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Referral</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, patient, hospital..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              aria-label="Search referrals"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              aria-label="Filter by referral status"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              aria-label="Filter by clinical priority"
            >
              {PRIORITY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Required Toggle / Reset Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActionOnly(!actionOnly);
                setPage(1);
              }}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border text-center transition-colors ${
                actionOnly
                  ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300'
              }`}
            >
              ⚠️ Needs Action Only
            </button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-slate-700 h-9 px-2"
                title="Reset all filters"
                aria-label="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <ReferralTrackingSkeleton rows={limit} />
      ) : error ? (
        <ReferralTrackingErrorState
          error={error}
          statusCode={statusCode}
          onRetry={() => fetchReferrals()}
        />
      ) : referrals.length === 0 ? (
        <ReferralTrackingEmptyState
          hasFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
        />
      ) : (
        <>
          <ReferralTrackingTable
            referrals={referrals}
            onSelectReferral={(r) => navigate(`/referrals/${r.id}`)}
          />

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{referrals.length}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{totalCount}</span> referrals
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 px-2"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="px-2 font-medium">
                  Page {page} of {totalPages}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 px-2"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
