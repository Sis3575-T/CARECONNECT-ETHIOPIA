import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Building,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Flame,
  User,
  Inbox
} from 'lucide-react';
import { hospitalService } from '../services/hospitalService.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import HospitalStatusBadge from '../components/HospitalStatusBadge.jsx';
import HospitalPriorityBadge from '../components/HospitalPriorityBadge.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';
import HospitalDashboardSkeleton from '../components/HospitalDashboardSkeleton.jsx';
import HospitalEmptyState from '../components/HospitalEmptyState.jsx';

const ACTION_TABS = [
  { id: 'ALL', label: 'All Actions' },
  { id: 'NEW_INCOMING', label: 'Awaiting Intake', statusHint: 'SUBMITTED' },
  { id: 'PENDING_TRIAGE', label: 'In Triage Review', statusHint: 'ACKNOWLEDGED / IN_REVIEW' },
  { id: 'INFO_REQUESTED', label: 'Info Requested', statusHint: 'INFO_REQUESTED' }
];

export default function PendingReferralsPage() {
  const navigate = useNavigate();

  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadPendingWorkQueue = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const items = await hospitalService.getPendingActions();
      setActions(items || []);
    } catch (err) {
      console.error('[HospitalPendingActions] Fetch error:', err);
      setError(err?.message || 'Failed to retrieve pending actions from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPendingWorkQueue();
  }, [loadPendingWorkQueue]);

  // Filter actions by category tab and search query
  const filteredActions = useMemo(() => {
    return actions.filter(act => {
      // Category tab filter
      if (activeTab !== 'ALL' && act.actionCategory !== activeTab) {
        return false;
      }

      // Search query filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const refCode = (act.reference_number || act.id || '').toLowerCase();
        const patientName = (act.patient_name || act.patientName || '').toLowerCase();
        const originFacility = (act.origin_facility_name || act.referringFacility || '').toLowerCase();
        const service = (act.service_category || act.service || '').toLowerCase();

        return (
          refCode.includes(query) ||
          patientName.includes(query) ||
          originFacility.includes(query) ||
          service.includes(query)
        );
      }

      return true;
    });
  }, [actions, activeTab, search]);

  const countsByCategory = useMemo(() => {
    return {
      ALL: actions.length,
      NEW_INCOMING: actions.filter(a => a.actionCategory === 'NEW_INCOMING').length,
      PENDING_TRIAGE: actions.filter(a => a.actionCategory === 'PENDING_TRIAGE').length,
      INFO_REQUESTED: actions.filter(a => a.actionCategory === 'INFO_REQUESTED').length
    };
  }, [actions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Hospital Pending Actions & Triage Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 text-[11px]">
              {actions.length} Actionable
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Operational triage workspace: review incoming referrals, process clinical bed triage, and monitor clarification responses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPendingWorkQueue(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Refresh pending actions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Operational SLA vs Clinical Triage Governance Alert */}
      <div className="bg-amber-50/70 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Administrative Operational Response SLAs & Clinical Governance
          </h2>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
            Target operational turnaround times (Emergency: 15 mins, Urgent: 2 hrs, Routine: 24 hrs) track inter-facility coordination responsiveness under regional SLAs. Operational delay tracking does not replace or modify clinical triage priority, which is set exclusively by healthcare clinicians.
          </p>
        </div>
      </div>

      {/* Filter and Tab Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            {ACTION_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === tab.id
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-extrabold'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {countsByCategory[tab.id] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions by ref, patient, or health centre..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Action Items List */}
      {loading ? (
        <HospitalDashboardSkeleton />
      ) : error ? (
        <HospitalErrorState
          title="Could not load pending actions queue"
          message={error}
          onRetry={() => loadPendingWorkQueue()}
        />
      ) : filteredActions.length === 0 ? (
        <HospitalEmptyState
          icon={CheckCircle2}
          title={search ? 'No actions matching your search' : 'No pending actions in this category'}
          description={
            search
              ? 'Try searching with different terms or switch category tabs.'
              : 'All referrals in this operational queue have been processed by hospital staff.'
          }
          action={
            search ? (
              <button
                onClick={() => setSearch('')}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Clear Search
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredActions.map(act => {
            const refCode = act.reference_number || act.id?.slice(0, 8);
            const patientName = act.patient_name || act.patientName || 'Unnamed Patient';
            const originFacility = act.origin_facility_name || act.referringFacility || 'Health Centre';
            const serviceRequested = act.service_category || act.service || 'General Inpatient';
            const submittedTime = act.submitted_at || act.created_at;
            const isEmergency = (act.priority || '').toUpperCase() === 'EMERGENCY';

            return (
              <div
                key={act.id}
                onClick={() => navigate(`/referrals/${act.id}`)}
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
                    <HospitalPriorityBadge priority={act.priority} />
                    <HospitalStatusBadge status={act.status} />
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Received {submittedTime ? formatRelativeTime(submittedTime) : 'recently'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Patient</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{patientName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {act.patient_gender || act.gender || '—'}, {act.patient_age ? `${act.patient_age} yrs` : 'Age N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Origin Health Centre</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{originFacility}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{serviceRequested}</p>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Required Action</span>
                    <p className="font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                      {act.actionRequired}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">
                    Primary diagnosis: <strong className="text-slate-800 dark:text-slate-200 font-medium">{act.primary_diagnosis || act.reason_for_referral || 'Clinical transfer'}</strong>
                  </span>

                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span>Open Referral</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
