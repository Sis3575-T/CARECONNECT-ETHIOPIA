import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  RefreshCw,
  Building,
  User,
  ArrowRight,
  Filter,
  Flame,
  Bed,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import { hospitalService } from '../services/hospitalService.js';
import { useHospitalRealtime } from '../hooks/useHospitalRealtime.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import HospitalPriorityBadge from '../components/HospitalPriorityBadge.jsx';
import ArrivalStatusBadge from '../components/arrival/ArrivalStatusBadge.jsx';
import ArrivalSkeleton from '../components/arrival/ArrivalSkeleton.jsx';
import ArrivalEmptyState from '../components/arrival/ArrivalEmptyState.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';

const ARRIVAL_TABS = [
  { id: 'ALL', label: 'All Active Arrivals' },
  { id: 'AWAITING_ARRIVAL', label: 'Accepted — Awaiting Arrival', statusHint: 'ACCEPTED' },
  { id: 'EN_ROUTE', label: 'En Route to Hospital', statusHint: 'IN_TRANSIT' },
  { id: 'ARRIVED', label: 'Arrived — Pending Handover', statusHint: 'PATIENT_ARRIVED' },
  { id: 'ADMITTED', label: 'Admitted to Ward', statusHint: 'IN_PROGRESS' }
];

export default function PatientArrivalsPage() {
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  // Additional workspace filters
  const [selectedFacility, setSelectedFacility] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST' | 'OLDEST' | 'PRIORITY' | 'PATIENT_NAME'
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadArrivalQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await hospitalService.getArrivalQueue({ limit: 100 });
      setReferrals(data.referrals || []);
    } catch (err) {
      console.error('[HospitalPatientArrivals] Fetch error:', err);
      setError(err?.message || 'Failed to retrieve arrival queue from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadArrivalQueue();
  }, [loadArrivalQueue]);

  // Real-time synchronization
  const { isLiveConnected, triggerSync: triggerLiveSync } = useHospitalRealtime({
    onEventReceived: () => {
      loadArrivalQueue(true);
    },
    pollingIntervalMs: 25000,
    enabled: true
  });

  // Unique filter choices extracted from loaded referrals
  const facilityOptions = useMemo(() => {
    const facs = new Set();
    referrals.forEach(r => {
      const name = r.origin_facility_name || r.referringFacility;
      if (name) facs.add(name);
    });
    return Array.from(facs).sort();
  }, [referrals]);

  const departmentOptions = useMemo(() => {
    const depts = new Set();
    referrals.forEach(r => {
      const d = r.allocated_ward_department || r.service_category;
      if (d) depts.add(d);
    });
    return Array.from(depts).sort();
  }, [referrals]);

  // Filter and sort referrals
  const filteredReferrals = useMemo(() => {
    let result = referrals.filter(r => {
      const statusUpper = (r.status || '').toUpperCase();
      const priorityUpper = (r.priority || '').toUpperCase();
      const originName = r.origin_facility_name || r.referringFacility || '';
      const deptName = r.allocated_ward_department || r.service_category || '';

      // Tab filter
      if (activeTab === 'AWAITING_ARRIVAL' && statusUpper !== 'ACCEPTED') return false;
      if (activeTab === 'EN_ROUTE' && !['TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'DISPATCHED'].includes(statusUpper)) return false;
      if (activeTab === 'ARRIVED' && !['PATIENT_ARRIVED', 'ARRIVED'].includes(statusUpper)) return false;
      if (activeTab === 'ADMITTED' && statusUpper !== 'IN_PROGRESS') return false;

      // Facility filter
      if (selectedFacility !== 'ALL' && originName !== selectedFacility) return false;

      // Priority filter
      if (selectedPriority !== 'ALL' && priorityUpper !== selectedPriority) return false;

      // Department filter
      if (selectedDepartment !== 'ALL' && deptName !== selectedDepartment) return false;

      // Search query filter (reference, patient name, origin, service, Fayda ID)
      if (search.trim()) {
        const query = search.toLowerCase();
        const refCode = (r.reference_number || r.id || '').toLowerCase();
        const pName = (r.patient_name || r.patientName || '').toLowerCase();
        const origin = originName.toLowerCase();
        const service = (r.service_category || r.service || '').toLowerCase();
        const fayda = (r.patient_fayda_id || '').toLowerCase();

        return (
          refCode.includes(query) ||
          pName.includes(query) ||
          origin.includes(query) ||
          service.includes(query) ||
          fayda.includes(query)
        );
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'PRIORITY') {
        const prioScore = (p) => (p === 'EMERGENCY' ? 3 : p === 'URGENT' ? 2 : 1);
        return prioScore((b.priority || '').toUpperCase()) - prioScore((a.priority || '').toUpperCase());
      }
      if (sortBy === 'PATIENT_NAME') {
        const nameA = a.patient_name || a.patientName || '';
        const nameB = b.patient_name || b.patientName || '';
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
      }
      // Default: NEWEST
      return new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0);
    });

    return result;
  }, [referrals, activeTab, selectedFacility, selectedPriority, selectedDepartment, search, sortBy]);

  // Paginated subset
  const totalPages = Math.ceil(filteredReferrals.length / pageSize) || 1;
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReferrals.slice(start, start + pageSize);
  }, [filteredReferrals, currentPage]);

  // Operational metrics
  const metrics = useMemo(() => {
    let awaitingCount = 0;
    let enRouteCount = 0;
    let arrivedCount = 0;
    let admittedCount = 0;

    for (const r of referrals) {
      const s = (r.status || '').toUpperCase();
      if (s === 'ACCEPTED') awaitingCount++;
      else if (['TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'DISPATCHED'].includes(s)) enRouteCount++;
      else if (s === 'PATIENT_ARRIVED' || s === 'ARRIVED') arrivedCount++;
      else if (s === 'IN_PROGRESS') admittedCount++;
    }

    return {
      total: referrals.length,
      awaitingCount,
      enRouteCount,
      arrivedCount,
      admittedCount
    };
  }, [referrals]);

  if (loading) {
    return <ArrivalSkeleton />;
  }

  if (error && referrals.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <HospitalErrorState
          title="Arrival queue unavailable"
          message={error || 'Unable to connect to hospital arrival records.'}
          onRetry={() => loadArrivalQueue()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>Patient Arrivals & Hospital Receiving</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Verify arriving patient identities, record physical arrivals, document handovers, and confirm ward admissions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isLiveConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{isLiveConnected ? 'Live Updates' : 'Polling'}</span>
          </span>

          <button
            onClick={() => triggerLiveSync(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Operational Arrival Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-bold text-[11px]">Awaiting Departure</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {metrics.awaitingCount}
          </p>
          <span className="text-[10px] text-slate-400">Accepted by triage team</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-bold text-[11px]">En Route / Dispatched</span>
            <Truck className="w-4 h-4 text-violet-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {metrics.enRouteCount}
          </p>
          <span className="text-[10px] text-slate-400">Ambulance in transit</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-bold text-[11px]">Arrived — Pending Handover</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {metrics.arrivedCount}
          </p>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Ready for reception</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="font-bold text-[11px]">Admitted to Ward</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1.5">
            {metrics.admittedCount}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Inpatient care active</span>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-700/60 scrollbar-none">
          {ARRIVAL_TABS.map((tab) => {
            const count =
              tab.id === 'ALL' ? metrics.total :
              tab.id === 'AWAITING_ARRIVAL' ? metrics.awaitingCount :
              tab.id === 'EN_ROUTE' ? metrics.enRouteCount :
              tab.id === 'ARRIVED' ? metrics.arrivedCount :
              metrics.admittedCount;

            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by patient name, referral reference, or Fayda ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showFilters || selectedFacility !== 'ALL' || selectedPriority !== 'ALL' || selectedDepartment !== 'ALL'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(selectedFacility !== 'ALL' || selectedPriority !== 'ALL' || selectedDepartment !== 'ALL') && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="PRIORITY">Emergency / Urgent First</option>
              <option value="PATIENT_NAME">Patient Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Expandable Advanced Filters Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in duration-150">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Referring Health Centre</label>
              <select
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">All Referring Health Centres</option>
                {facilityOptions.map((fac) => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Clinical Priority</label>
              <select
                value={selectedPriority}
                onChange={(e) => {
                  setSelectedPriority(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">All Priorities</option>
                <option value="EMERGENCY">Emergency (Immediate)</option>
                <option value="URGENT">Urgent (&lt; 24h)</option>
                <option value="ROUTINE">Routine Elective</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Receiving Ward / Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">All Wards / Departments</option>
                {departmentOptions.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Referrals Queue Presentation */}
      {filteredReferrals.length === 0 ? (
        <ArrivalEmptyState
          title={search || selectedFacility !== 'ALL' || selectedPriority !== 'ALL' ? 'No matching patient records found' : 'No patients currently in this arrival queue'}
          message={
            search || selectedFacility !== 'ALL' || selectedPriority !== 'ALL'
              ? 'Try resetting your filter parameters or search with different keywords.'
              : 'There are no accepted patient referrals matching this operational receiving stage.'
          }
          action={
            (search || selectedFacility !== 'ALL' || selectedPriority !== 'ALL' || selectedDepartment !== 'ALL') ? (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedFacility('ALL');
                  setSelectedPriority('ALL');
                  setSelectedDepartment('ALL');
                  setCurrentPage(1);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {paginatedReferrals.map((r) => {
            const refCode = r.reference_number || r.id?.slice(0, 8);
            const patientName = r.patient_name || r.patientName || 'Unnamed Patient';
            const originFacility = r.origin_facility_name || r.referringFacility || 'Health Centre';
            const serviceRequested = r.service_category || r.service || 'General Inpatient';
            const isEmergency = (r.priority || '').toUpperCase() === 'EMERGENCY';

            return (
              <div
                key={r.id}
                onClick={() => navigate(`/arrivals/${r.id}`)}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-4.5 shadow-xs transition-all hover:border-emerald-500 dark:hover:border-emerald-500 cursor-pointer space-y-3 ${
                  isEmergency
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {refCode}
                    </span>
                    <HospitalPriorityBadge priority={r.priority} />
                    <ArrivalStatusBadge status={r.status} />
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {r.arrived_at
                        ? `Arrived ${formatClinicalDate(r.arrived_at)}`
                        : r.submitted_at
                        ? `Submitted ${formatRelativeTime(r.submitted_at)}`
                        : 'Active case'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Patient</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{patientName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {r.patient_gender || r.gender || '—'}, {r.patient_age ? `${r.patient_age} yrs` : 'Age N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Origin & Specialty</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{originFacility}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{serviceRequested}</p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Assigned Ward / Bed</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {r.allocated_ward_department || 'General Inpatient Ward'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Bed: <strong className="font-semibold text-slate-700 dark:text-slate-300">{r.assigned_bed_type || 'STANDARD'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Admission diagnosis: <strong className="text-slate-800 dark:text-slate-200 font-medium">{r.primary_diagnosis || 'Referral condition'}</strong>
                  </span>

                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span>Manage Receiving & Handover</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({filteredReferrals.length} total referrals)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 font-bold transition-all flex items-center gap-1"
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
