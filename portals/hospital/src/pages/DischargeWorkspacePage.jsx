import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LogOut,
  Search,
  Filter,
  RotateCcw,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  FileText,
  Activity,
  ArrowRight,
  Share2,
  CornerDownLeft,
  Bed,
  Archive
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import { hospitalService, calculateDischargeMetrics } from '../services/hospitalService.js';
import { DischargeStatusBadge } from '../components/discharge/DischargeStatusBadge.jsx';
import { DischargeSkeleton } from '../components/discharge/DischargeSkeleton.jsx';
import { DischargeEmptyState } from '../components/discharge/DischargeEmptyState.jsx';
import { HospitalPriorityBadge } from '../components/HospitalPriorityBadge.jsx';
import { useHospitalRealtime } from '../hooks/useHospitalRealtime.js';

const DISCHARGE_TABS = [
  { key: 'ALL', label: 'All Cases' },
  { key: 'READY', label: 'In Care / Ready' },
  { key: 'DISCHARGED', label: 'Discharged' },
  { key: 'TRANSFERRED', label: 'Transferred Out' },
  { key: 'COUNTER_REFERRED', label: 'Counter-Referred (HC)' },
  { key: 'CLOSED', label: 'Closed Dossiers' }
];

export default function DischargeWorkspacePage() {
  const { user } = useAuth();

  // Data states
  const [referrals, setReferrals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK'
  const [sortBy, setSortBy] = useState('DATE_DESC'); // 'DATE_DESC' | 'DATE_ASC' | 'PRIORITY' | 'CODE'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch discharge queue and facility departments
  const loadDischargeData = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [queueRes, deptRes] = await Promise.allSettled([
        hospitalService.getDischargeQueue(),
        user?.facilityId ? hospitalService.getHospitalDepartments(user.facilityId) : Promise.resolve([])
      ]);

      if (queueRes.status === 'fulfilled') {
        const rawItems = queueRes.value?.referrals || [];
        // Strict hospital facility tenancy enforcement
        const isolatedItems = user?.facilityId
          ? rawItems.filter(r => !r.destination_facility_id || r.destination_facility_id === user.facilityId)
          : rawItems;
        setReferrals(isolatedItems);
      } else {
        throw queueRes.reason || new Error('Failed to load discharge referrals');
      }

      if (deptRes.status === 'fulfilled') {
        setDepartments(Array.isArray(deptRes.value) ? deptRes.value : []);
      }
    } catch (err) {
      console.error('[DischargeWorkspacePage] Error loading discharge cases:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to retrieve discharge cases.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.facilityId]);

  useEffect(() => {
    loadDischargeData();
  }, [loadDischargeData]);

  // Real-time telemetry: auto-refresh workspace on incoming hospital updates
  useHospitalRealtime({
    onReferralUpdated: () => loadDischargeData(true),
    onNotificationReceived: () => loadDischargeData(true)
  });

  // Calculate operational discharge and outcome metrics
  const metrics = useMemo(() => calculateDischargeMetrics(referrals), [referrals]);

  // Filter and sort referrals
  const filteredReferrals = useMemo(() => {
    let result = [...referrals];

    // Stage Tab filter
    if (activeTab === 'READY') {
      result = result.filter(r => {
        const s = (r.status || '').toUpperCase();
        const hasReassign = Array.isArray(r.reassignments) && r.reassignments.length > 0;
        return (s === 'IN_PROGRESS' || s === 'PATIENT_ARRIVED' || s === 'ARRIVED') && !hasReassign;
      });
    } else if (activeTab === 'DISCHARGED') {
      result = result.filter(r => {
        const s = (r.status || '').toUpperCase();
        const isCounter = Boolean(
          r.counter_referral_instructions ||
          r.completion_reason === 'RETURNED_TO_REFERRING_FACILITY'
        );
        return s === 'COMPLETED' && !isCounter;
      });
    } else if (activeTab === 'TRANSFERRED') {
      result = result.filter(r => {
        const s = (r.status || '').toUpperCase();
        const hasReassign = Array.isArray(r.reassignments) ? r.reassignments.length > 0 : Boolean(r.reassigned_to_facility_id);
        return s === 'TRANSFERRED' || hasReassign;
      });
    } else if (activeTab === 'COUNTER_REFERRED') {
      result = result.filter(r => {
        return Boolean(
          r.counter_referral_instructions ||
          r.completion_reason === 'RETURNED_TO_REFERRING_FACILITY'
        );
      });
    } else if (activeTab === 'CLOSED') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'CLOSED');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => {
        const pName = (r.patient?.full_name || r.patient?.name || r.patient_name || '').toLowerCase();
        const refCode = (r.referral_code || '').toLowerCase();
        const faydaId = (r.patient?.fayda_id || r.fayda_id || '').toLowerCase();
        const originName = (r.origin_facility?.name || r.origin_facility_name || '').toLowerCase();
        return pName.includes(q) || refCode.includes(q) || faydaId.includes(q) || originName.includes(q);
      });
    }

    // Department filter
    if (selectedDept !== 'ALL') {
      result = result.filter(r => {
        const dept = (r.allocated_ward_department || '').toLowerCase();
        return dept === selectedDept.toLowerCase();
      });
    }

    // Priority filter
    if (selectedPriority !== 'ALL') {
      result = result.filter(r => (r.priority || '').toUpperCase() === selectedPriority);
    }

    // Date range filter
    if (selectedDateRange !== 'ALL') {
      const now = new Date();
      result = result.filter(r => {
        const d = new Date(r.updated_at || r.arrival_confirmed_at || r.created_at);
        if (isNaN(d.getTime())) return true;
        const diffHours = (now - d) / (1000 * 60 * 60);
        if (selectedDateRange === 'TODAY') return diffHours <= 24;
        if (selectedDateRange === 'WEEK') return diffHours <= 168;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        const dateA = new Date(a.updated_at || a.created_at).getTime() || 0;
        const dateB = new Date(b.updated_at || b.created_at).getTime() || 0;
        return dateB - dateA;
      }
      if (sortBy === 'DATE_ASC') {
        const dateA = new Date(a.updated_at || a.created_at).getTime() || 0;
        const dateB = new Date(b.updated_at || b.created_at).getTime() || 0;
        return dateA - dateB;
      }
      if (sortBy === 'PRIORITY') {
        const pOrder = { EMERGENCY: 3, URGENT: 2, ROUTINE: 1 };
        const pA = pOrder[(a.priority || '').toUpperCase()] || 0;
        const pB = pOrder[(b.priority || '').toUpperCase()] || 0;
        return pB - pA;
      }
      if (sortBy === 'CODE') {
        return (a.referral_code || '').localeCompare(b.referral_code || '');
      }
      return 0;
    });

    return result;
  }, [referrals, activeTab, searchQuery, selectedDept, selectedPriority, selectedDateRange, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredReferrals.length / itemsPerPage));
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReferrals.slice(start, start + itemsPerPage);
  }, [filteredReferrals, currentPage, itemsPerPage]);

  const handleResetFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setSelectedDept('ALL');
    setSelectedPriority('ALL');
    setSelectedDateRange('ALL');
    setSortBy('DATE_DESC');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="discharge-workspace-page">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <LogOut className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Hospital Operations
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Referral Discharge, Transfer & Outcome Workspace
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Authoritative clinical discharge, inter-facility transfers, counter-referrals to health centres, and standardized outcome documentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadDischargeData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="discharge-metrics-grid">
        {/* Card 1: Ready for Disposition / In Care */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>In Care / Ready</span>
            <Bed className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.readyForDischarge}
          </div>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 block">
            Admitted inpatients eligible for discharge/transfer
          </span>
        </div>

        {/* Card 2: Inter-Facility Transferred */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Transferred Out</span>
            <Share2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.transferredCount}
          </div>
          <span className="text-xs text-purple-600 dark:text-purple-400 mt-1 block">
            Reassigned to specialized hospitals
          </span>
        </div>

        {/* Card 3: Counter-Referred to HC */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Counter-Referred</span>
            <CornerDownLeft className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.counterReferredCount}
          </div>
          <span className="text-xs text-sky-600 dark:text-sky-400 mt-1 block">
            Returned to origin health centre
          </span>
        </div>

        {/* Card 4: Discharged & Completed */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Discharged & Closed</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.dischargedCount + metrics.closedCount}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 block">
            {metrics.dischargedCount} discharged • {metrics.closedCount} closed
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto pb-1" aria-label="Discharge Workspace Stages">
          {DISCHARGE_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap px-1 transition-colors ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient name, referral code, or origin facility..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs sm:text-sm py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id || dept.code} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs sm:text-sm py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="URGENT">Urgent</option>
            <option value="ROUTINE">Routine</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs sm:text-sm py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="DATE_DESC">Newest First</option>
            <option value="DATE_ASC">Oldest First</option>
            <option value="PRIORITY">Priority</option>
            <option value="CODE">Referral Code</option>
          </select>

          {(searchQuery || selectedDept !== 'ALL' || selectedPriority !== 'ALL' || activeTab !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <DischargeSkeleton count={5} />
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-8 text-center text-rose-800 dark:text-rose-200 space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <h3 className="font-semibold text-base">{error}</h3>
          <button
            type="button"
            onClick={() => loadDischargeData()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Retry Loading
          </button>
        </div>
      ) : paginatedReferrals.length === 0 ? (
        <DischargeEmptyState onReset={handleResetFilters} />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">Patient / Referral ID</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Referring Facility</th>
                  <th className="py-3.5 px-4">Department & Ward</th>
                  <th className="py-3.5 px-4">Status & Disposition</th>
                  <th className="py-3.5 px-4">Stay Duration</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedReferrals.map((r) => {
                  const patient = r.patient || {};
                  const maskedFaydaId = patient.national_id_masked ||
                    (patient.fayda_id ? `••••-••••-${patient.fayda_id.slice(-4)}` : null) ||
                    (r.fayda_id ? `••••-••••-${r.fayda_id.slice(-4)}` : '••••-••••-0000');

                  const hasReassignments = Array.isArray(r.reassignments) && r.reassignments.length > 0;
                  const isTransferred = (r.status || '').toUpperCase() === 'TRANSFERRED' || hasReassignments;
                  const isCounter = Boolean(
                    r.counter_referral_instructions ||
                    r.completion_reason === 'RETURNED_TO_REFERRING_FACILITY'
                  );

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`discharge-row-${r.id}`}
                    >
                      {/* Patient Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {patient.full_name || patient.name || r.patient_name || 'Anonymous Patient'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          <span>{r.referral_code || `REF-${r.id}`}</span>
                          <span>•</span>
                          <span>{maskedFaydaId}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <HospitalPriorityBadge priority={r.priority} />
                      </td>

                      {/* Originating Facility */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {r.origin_facility?.name || r.origin_facility_name || 'Primary Health Centre'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {r.origin_facility?.region || 'National Network'}
                        </span>
                      </td>

                      {/* Department & Ward */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {r.allocated_ward_department || 'General Inpatient'}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          Bed: {r.assigned_bed_type || 'Standard'}
                        </span>
                      </td>

                      {/* Status & Disposition */}
                      <td className="py-3.5 px-4">
                        <DischargeStatusBadge
                          status={r.status}
                          isTransferred={isTransferred}
                          isCounterReferred={isCounter}
                        />
                      </td>

                      {/* Stay Duration */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          {formatClinicalDate(r.arrival_confirmed_at || r.admitted_at || r.created_at)}
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {formatRelativeTime(r.arrival_confirmed_at || r.admitted_at || r.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/discharges/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReferrals.length)} of {filteredReferrals.length} cases
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                  {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
