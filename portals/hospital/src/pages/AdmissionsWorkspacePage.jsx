import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed,
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
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { formatClinicalDate, formatRelativeTime, formatPatientId } from '@shared/utils/formatters.js';
import { hospitalService, calculateAdmissionMetrics } from '../services/hospitalService.js';
import { AdmissionStatusBadge } from '../components/admission/AdmissionStatusBadge.jsx';
import { AdmissionSkeleton } from '../components/admission/AdmissionSkeleton.jsx';
import { AdmissionEmptyState } from '../components/admission/AdmissionEmptyState.jsx';
import { HospitalPriorityBadge } from '../components/HospitalPriorityBadge.jsx';

const STAGE_TABS = [
  { key: 'ALL', label: 'All Inpatients' },
  { key: 'PENDING_PLACEMENT', label: 'Awaiting Placement' },
  { key: 'IN_PROGRESS', label: 'Active Inpatient Care' },
  { key: 'COMPLETED', label: 'Care Completed' },
  { key: 'CLOSED', label: 'Dossier Closed' }
];

export default function AdmissionsWorkspacePage() {
  const { user } = useAuth();

  // Primary data states
  const [referrals, setReferrals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedBedType, setSelectedBedType] = useState('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK'
  const [sortBy, setSortBy] = useState('ARRIVAL_DESC'); // 'ARRIVAL_DESC' | 'ARRIVAL_ASC' | 'PRIORITY' | 'REF'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch admissions queue and facility departments
  const loadAdmissionsData = useCallback(async (isSilent = false) => {
    if (isSilent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [queueRes, deptRes] = await Promise.allSettled([
        hospitalService.getAdmissionsQueue(),
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
        throw queueRes.reason || new Error('Failed to load admission referrals');
      }

      if (deptRes.status === 'fulfilled') {
        setDepartments(Array.isArray(deptRes.value) ? deptRes.value : []);
      }
    } catch (err) {
      console.error('[AdmissionsWorkspacePage] Error loading admissions:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to retrieve inpatient admissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.facilityId]);

  useEffect(() => {
    loadAdmissionsData();
  }, [loadAdmissionsData]);

  // Operational metrics
  const metrics = useMemo(() => calculateAdmissionMetrics(referrals), [referrals]);

  // Filter and sort referrals
  const filteredReferrals = useMemo(() => {
    let result = [...referrals];

    // Stage Tab filter
    if (activeTab === 'PENDING_PLACEMENT') {
      result = result.filter(r => {
        const s = (r.status || '').toUpperCase();
        return s === 'PATIENT_ARRIVED' || s === 'ARRIVED';
      });
    } else if (activeTab === 'IN_PROGRESS') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'IN_PROGRESS');
    } else if (activeTab === 'COMPLETED') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'COMPLETED');
    } else if (activeTab === 'CLOSED') {
      result = result.filter(r => (r.status || '').toUpperCase() === 'CLOSED');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => {
        const refNum = (r.reference_number || r.id || '').toLowerCase();
        const pName = (r.patient_name || `${r.patient_first_name || ''} ${r.patient_father_name || ''}`).toLowerCase();
        const mrn = (r.patient_mrn || r.patient_national_id || '').toLowerCase();
        const dept = (r.allocated_ward_department || '').toLowerCase();
        return refNum.includes(q) || pName.includes(q) || mrn.includes(q) || dept.includes(q);
      });
    }

    // Department filter
    if (selectedDept !== 'ALL') {
      result = result.filter(r => {
        const dept = (r.allocated_ward_department || '').toLowerCase();
        return dept.includes(selectedDept.toLowerCase());
      });
    }

    // Bed Type filter
    if (selectedBedType !== 'ALL') {
      result = result.filter(r => {
        const bed = (r.assigned_bed_type || '').toUpperCase();
        return bed === selectedBedType.toUpperCase();
      });
    }

    // Date Range filter
    if (selectedDateRange !== 'ALL') {
      const now = new Date();
      result = result.filter(r => {
        const targetDate = r.arrived_at || r.updated_at || r.created_at;
        if (!targetDate) return true;
        const d = new Date(targetDate);
        if (selectedDateRange === 'TODAY') {
          return d.toDateString() === now.toDateString();
        } else if (selectedDateRange === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return d >= sevenDaysAgo;
        }
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        const priorityOrder = { EMERGENCY: 3, URGENT: 2, ROUTINE: 1 };
        const pA = priorityOrder[(a.priority || '').toUpperCase()] || 0;
        const pB = priorityOrder[(b.priority || '').toUpperCase()] || 0;
        return pB - pA;
      }
      if (sortBy === 'REF') {
        return (a.reference_number || '').localeCompare(b.reference_number || '');
      }
      if (sortBy === 'ARRIVAL_ASC') {
        const tA = new Date(a.arrived_at || a.created_at || 0).getTime();
        const tB = new Date(b.arrived_at || b.created_at || 0).getTime();
        return tA - tB;
      }
      // Default: ARRIVAL_DESC (newest first)
      const tA = new Date(a.arrived_at || a.created_at || 0).getTime();
      const tB = new Date(b.arrived_at || b.created_at || 0).getTime();
      return tB - tA;
    });

    return result;
  }, [referrals, activeTab, searchQuery, selectedDept, selectedBedType, selectedDateRange, sortBy]);

  // Pagination calculation
  const totalItems = filteredReferrals.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReferrals.slice(start, start + itemsPerPage);
  }, [filteredReferrals, currentPage]);

  const resetFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setSelectedDept('ALL');
    setSelectedBedType('ALL');
    setSelectedDateRange('ALL');
    setSortBy('ARRIVAL_DESC');
    setCurrentPage(1);
  };

  const isFilteringActive =
    activeTab !== 'ALL' ||
    searchQuery.trim() !== '' ||
    selectedDept !== 'ALL' ||
    selectedBedType !== 'ALL' ||
    selectedDateRange !== 'ALL';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Inpatient Admission & Care Tracking</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track received referrals, allocate hospital departments & beds, monitor ongoing clinical care, and finalize discharge.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadAdmissionsData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Workspace</span>
          </button>
        </div>
      </div>

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admissions-metrics-cards">
        {/* Metric 1: Pending Placement */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Awaiting Ward Placement
            </span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {metrics.receivedPendingAdmission}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">Arrived at triage bay</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Active Inpatient Care */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active Inpatient Care
            </span>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {metrics.inProgressAdmitted}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">Admitted into wards</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bed className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Care Completed */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Care Completed
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {metrics.completedCount}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">Specialist goals satisfied</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: ICU / High Dependency */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Critical / ICU Placements
            </span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {metrics.icuCount}
            </div>
            <span className="text-xs text-slate-400 mt-0.5 block">Intensive care beds</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Stage Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
        {STAGE_TABS.map(tab => {
          let countBadge = null;
          if (tab.key === 'PENDING_PLACEMENT') countBadge = metrics.receivedPendingAdmission;
          else if (tab.key === 'IN_PROGRESS') countBadge = metrics.inProgressAdmitted;
          else if (tab.key === 'COMPLETED') countBadge = metrics.completedCount;
          else if (tab.key === 'CLOSED') countBadge = metrics.closedCount;
          else countBadge = metrics.totalAdmissions;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.key
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {countBadge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Advanced Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Reference, Patient Name, MRN or Ward..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <div className="relative">
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Hospital Departments</option>
              {departments.map((d) => (
                <option key={d.id || d.code} value={d.name || d.code}>
                  {d.name || d.code}
                </option>
              ))}
            </select>
          </div>

          {/* Bed Classification Filter */}
          <div className="relative">
            <select
              value={selectedBedType}
              onChange={(e) => {
                setSelectedBedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Bed Types</option>
              <option value="STANDARD">Standard Ward Bed</option>
              <option value="EMERGENCY_OBSERVATION">Emergency Observation</option>
              <option value="ICU">Intensive Care (ICU)</option>
              <option value="ISOLATION">Isolation Ward</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-500">Filter By Date:</span>
            <button
              type="button"
              onClick={() => { setSelectedDateRange('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md transition-colors ${selectedDateRange === 'ALL' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDateRange('TODAY'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md transition-colors ${selectedDateRange === 'TODAY' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => { setSelectedDateRange('WEEK'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-md transition-colors ${selectedDateRange === 'WEEK' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
            >
              Past 7 Days
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="ARRIVAL_DESC">Arrival (Newest First)</option>
              <option value="ARRIVAL_ASC">Arrival (Oldest First)</option>
              <option value="PRIORITY">Priority (Emergency First)</option>
              <option value="REF">Reference Number</option>
            </select>

            {isFilteringActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <AdmissionSkeleton count={5} />
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">{error}</h3>
          <button
            type="button"
            onClick={() => loadAdmissionsData()}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
          >
            Retry Loading
          </button>
        </div>
      ) : paginatedReferrals.length === 0 ? (
        <AdmissionEmptyState
          title={isFilteringActive ? 'No matching admissions found' : 'No Inpatient Admissions'}
          message={
            isFilteringActive
              ? 'No patients match your search or filter criteria. Try adjusting your query or resetting filters.'
              : 'There are currently no patients in the inpatient admission queue for your hospital.'
          }
          onReset={isFilteringActive ? resetFilters : undefined}
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Reference & Priority</th>
                  <th className="py-3 px-4">Patient Identification</th>
                  <th className="py-3 px-4">Admission Status</th>
                  <th className="py-3 px-4">Department & Bed</th>
                  <th className="py-3 px-4">Arrival Timestamp</th>
                  <th className="py-3 px-4">Latest Progress Update</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedReferrals.map((r) => {
                  const patientDisplayName =
                    r.patient_name ||
                    `${r.patient_first_name || ''} ${r.patient_father_name || ''}`.trim() ||
                    'Patient';
                  const maskedNationalId = formatPatientId(r.patient_national_id || r.patient_mrn || r.patient_id);
                  const statusKey = String(r.status || '').toUpperCase();
                  const isAwaitingPlacement = statusKey === 'PATIENT_ARRIVED' || statusKey === 'ARRIVED';

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      data-testid={`admission-row-${r.id}`}
                    >
                      {/* 1. Reference & Priority */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="space-y-1">
                          <span className="font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded text-xs">
                            {r.reference_number || r.id}
                          </span>
                          <div>
                            <HospitalPriorityBadge priority={r.priority} />
                          </div>
                        </div>
                      </td>

                      {/* 2. Patient Identification */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {patientDisplayName}
                        </div>
                        <div className="text-slate-400 text-2xs mt-0.5">
                          ID: <span className="font-mono">{maskedNationalId}</span> • {r.patient_age_years ? `${r.patient_age_years}y` : 'N/A'}, {r.patient_gender || '—'}
                        </div>
                        <div className="text-slate-400 text-2xs">
                          From: {r.origin_facility_name || r.origin_facility_id}
                        </div>
                      </td>

                      {/* 3. Operational Admission Status */}
                      <td className="py-3.5 px-4">
                        <AdmissionStatusBadge status={r.status} />
                        {isAwaitingPlacement && (
                          <div className="text-2xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                            Needs Inpatient Placement
                          </div>
                        )}
                      </td>

                      {/* 4. Department & Bed */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.allocated_ward_department || 'Unassigned'}</span>
                        </div>
                        <div className="text-slate-400 text-2xs mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>{r.assigned_bed_type || 'Standard Bed'}</span>
                        </div>
                      </td>

                      {/* 5. Arrival Timestamp */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {r.arrived_at ? formatClinicalDate(r.arrived_at) : 'Arrival Logged'}
                        </div>
                        <div className="text-slate-400 text-2xs mt-0.5">
                          {r.arrived_at ? formatRelativeTime(r.arrived_at) : 'Active'}
                        </div>
                      </td>

                      {/* 6. Latest Progress Update */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-2xs text-slate-600 dark:text-slate-400 truncate" title={r.current_progress_notes || ''}>
                          {r.current_progress_notes || 'Patient received. Clinical evaluation ongoing.'}
                        </p>
                        {r.receiving_clinician_first_name && (
                          <div className="text-2xs text-slate-400 mt-0.5">
                            Attending: Dr. {r.receiving_clinician_first_name}
                          </div>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admissions/${r.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
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
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> admissions
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <span className="font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
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
