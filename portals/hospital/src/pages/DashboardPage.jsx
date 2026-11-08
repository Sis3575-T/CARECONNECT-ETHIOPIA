import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  FileText,
  Activity,
  Layers,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { ROLE_LABELS } from '@shared/constants/roles.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import { hospitalService } from '../services/hospitalService.js';
import HospitalStatusBadge from '../components/HospitalStatusBadge.jsx';
import HospitalPriorityBadge from '../components/HospitalPriorityBadge.jsx';
import HospitalDashboardSkeleton from '../components/HospitalDashboardSkeleton.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';
import HospitalEmptyState from '../components/HospitalEmptyState.jsx';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatCurrentDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [hospitalProfile, setHospitalProfile] = useState(null);
  const [recentReferrals, setRecentReferrals] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);

  const clinicianName = useMemo(() => {
    return (
      user?.name ||
      [user?.firstName || user?.first_name, user?.lastName || user?.last_name].filter(Boolean).join(' ') ||
      'Hospital Specialist'
    );
  }, [user]);

  const clinicianRole = useMemo(() => {
    return ROLE_LABELS[user?.role] || user?.roleName || user?.role || 'Hospital Triage Clinician';
  }, [user]);

  const hospitalName = useMemo(() => {
    return (
      hospitalProfile?.name ||
      user?.facilityName ||
      user?.facility_name ||
      'Specialized Hospital'
    );
  }, [hospitalProfile, user]);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // Load summary, hospital profile, and pending actions concurrently
      const [summaryData, actionsData] = await Promise.all([
        hospitalService.getDashboardSummary(),
        hospitalService.getPendingActions()
      ]);

      setMetrics(summaryData);
      setPendingActions(actionsData || []);
      setRecentReferrals((summaryData?.referrals || []).slice(0, 7));

      if (user?.facilityId) {
        const facProfile = await hospitalService.getHospitalProfile(user.facilityId);
        if (facProfile) setHospitalProfile(facProfile);
      }
    } catch (err) {
      console.error('[HospitalDashboard] Data loading error:', err);
      setError(err?.message || 'Failed to retrieve hospital dashboard metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.facilityId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return <HospitalDashboardSkeleton />;
  }

  if (error && !metrics) {
    return <HospitalErrorState message={error} onRetry={() => loadDashboardData()} />;
  }

  const pendingCount = metrics?.pendingTriageCount || 0;
  const inReviewCount = metrics?.inReviewCount || 0;
  const acceptedCount = metrics?.acceptedCount || 0;
  const infoRequestedCount = metrics?.infoRequestedCount || 0;
  const emergencyCount = metrics?.emergencyCount || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-10">
      {/* Top Welcome & Hospital Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Building2 className="w-3 h-3" />
              <span>{hospitalName}</span>
            </span>
            <span className="text-slate-400 dark:text-slate-500">•</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">{formatCurrentDate()}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}, {clinicianName}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {clinicianRole} — Specialized Inpatient Referral Intake & Clinical Triage Workspace
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Refresh dashboard data"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/incoming')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Inbox className="w-4 h-4" />
            <span>Incoming Queue</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-800 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/pending')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold transition-all flex items-center gap-1.5 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Pending Triage</span>
          </button>
        </div>
      </div>

      {/* Emergency Triage Attention Banner */}
      {emergencyCount > 0 && (
        <div
          className="bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-600 p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Critical Emergency Cases Awaiting Immediate Hospital Triage
              </h2>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                There {emergencyCount === 1 ? 'is 1 incoming emergency referral' : `are ${emergencyCount} incoming emergency referrals`} requiring rapid resuscitation bed assessment and specialist response.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/incoming?priority=EMERGENCY')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer shadow-xs flex items-center gap-1"
          >
            <span>Review Emergency Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Primary Operational Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: New Incoming */}
        <div
          onClick={() => navigate('/incoming?status=SUBMITTED')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-all group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/incoming?status=SUBMITTED')}
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900 group-hover:scale-105 transition-transform">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">New Incoming</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{pendingCount}</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Awaiting acknowledgement</span>
          </div>
        </div>

        {/* Card 2: Pending Triage Review */}
        <div
          onClick={() => navigate('/pending')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-amber-500 dark:hover:border-amber-500 transition-all group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/pending')}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900 group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">In Triage Review</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{inReviewCount}</p>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Specialist review active</span>
          </div>
        </div>

        {/* Card 3: Accepted Referrals */}
        <div
          onClick={() => navigate('/accepted')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-teal-500 dark:hover:border-teal-500 transition-all group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/accepted')}
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-900 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Accepted Cases</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{acceptedCount}</p>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Beds allocated</span>
          </div>
        </div>

        {/* Card 4: Additional Info Requested */}
        <div
          onClick={() => navigate('/pending')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-all group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/pending')}
        >
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900 group-hover:scale-105 transition-transform">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Info Requested</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{infoRequestedCount}</p>
            <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">Awaiting health centre</span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Telemetry Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Referrals Received</span>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
            {metrics?.totalIncoming || 0}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Active Pipeline Cases</span>
          <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {metrics?.activeCases || 0}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Admitted / Arrived</span>
          <p className="text-base font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">
            {(metrics?.arrivedCount || 0) + (metrics?.completedCount || 0)}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Triage Acceptance Rate</span>
          <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
            {metrics?.acceptanceRate || 100}%
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Incoming Queue (Left) & Pending Actions / Hospital Status (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Wide, 2 cols): Recent Incoming Referrals Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Incoming Referrals</h2>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                Latest patient transfer requests submitted to this hospital
              </p>
            </div>
            <button
              onClick={() => navigate('/incoming')}
              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View All Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentReferrals.length === 0 ? (
            <HospitalEmptyState
              title="No incoming referrals yet"
              description="Referrals directed to this hospital from regional health centres will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th scope="col" className="py-2.5 px-3">Referral Ref</th>
                    <th scope="col" className="py-2.5 px-3">Patient</th>
                    <th scope="col" className="py-2.5 px-3">Origin Facility</th>
                    <th scope="col" className="py-2.5 px-3">Priority</th>
                    <th scope="col" className="py-2.5 px-3">Status</th>
                    <th scope="col" className="py-2.5 px-3">Received</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentReferrals.map((ref) => {
                    const patientName = ref.patient_name || ref.patientName || 'Unnamed Patient';
                    const refCode = ref.reference_number || ref.id?.slice(0, 8);
                    const originName = ref.origin_facility_name || ref.referringFacility || 'Health Centre';
                    const timeReceived = ref.submitted_at || ref.created_at;

                    return (
                      <tr
                        key={ref.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/referrals/${ref.id}`)}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {refCode}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{patientName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {ref.patient_gender || ref.gender || '—'}, {ref.patient_age ? `${ref.patient_age} yrs` : 'Age unrecorded'}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {originName}
                        </td>
                        <td className="py-3 px-3">
                          <HospitalPriorityBadge priority={ref.priority} />
                        </td>
                        <td className="py-3 px-3">
                          <HospitalStatusBadge status={ref.status} />
                        </td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                          {timeReceived ? formatRelativeTime(timeReceived) : 'Recently'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/referrals/${ref.id}`);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Pending Actions Work Queue */}
        <div className="space-y-5">
          {/* Action Center Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pending Work Queue</h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                {pendingActions.length} Pending
              </span>
            </div>

            {pendingActions.length === 0 ? (
              <div className="py-6 text-center text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">All referrals reviewed</p>
                <p className="text-[11px] mt-0.5">No immediate triage responses pending.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingActions.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    onClick={() => navigate(`/referrals/${act.id}`)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-900 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                        {act.reference_number || act.id?.slice(0, 8)}
                      </span>
                      <HospitalPriorityBadge priority={act.priority} />
                    </div>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-xs truncate">
                      {act.patient_name || act.patientName || 'Patient'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">{act.actionRequired}</span>
                      <span>{act.submitted_at ? formatRelativeTime(act.submitted_at) : 'Active'}</span>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => navigate('/pending')}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Open Complete Pending Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Hospital Readiness & Clinical Guidance Notice */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>National Referral Guideline Compliance</span>
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
              All clinical admissions and triage decisions must comply with Ethiopian Federal Ministry of Health referral protocol. Emergency cases must be acknowledged within 15 minutes of receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
