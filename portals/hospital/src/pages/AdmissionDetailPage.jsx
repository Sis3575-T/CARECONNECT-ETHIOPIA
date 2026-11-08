import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bed,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  User,
  Shield,
  RefreshCw,
  PlusCircle,
  Layers,
  ChevronRight,
  Archive,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { formatClinicalDate, formatRelativeTime, formatPatientId } from '@shared/utils/formatters.js';
import { hospitalService } from '../services/hospitalService.js';
import { AdmissionStatusBadge } from '../components/admission/AdmissionStatusBadge.jsx';
import { AdmissionSkeleton } from '../components/admission/AdmissionSkeleton.jsx';
import { HospitalPriorityBadge } from '../components/HospitalPriorityBadge.jsx';

export default function AdmissionDetailPage() {
  const { referralId, id } = useParams();
  const effectiveId = referralId || id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [referral, setReferral] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'progress' | 'history'

  // Modals visibility state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchReferralDetails = useCallback(async (isRefresh = false) => {
    if (!effectiveId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await hospitalService.getReferralDetail(effectiveId);
      if (!data) {
        throw new Error(`Referral record [${effectiveId}] not found`);
      }

      // Enforce hospital tenancy isolation
      if (user?.facilityId && data.destination_facility_id && data.destination_facility_id !== user.facilityId) {
        throw new Error('Access denied: You are only authorized to view admissions for your hospital.');
      }

      setReferral(data);

      // Load coordination follow-ups / progress events
      try {
        const historyRes = await hospitalService.getFollowUpHistory(effectiveId);
        setFollowUps(Array.isArray(historyRes) ? historyRes : (historyRes?.followUps || []));
      } catch {
        // Fallback gracefully
      }
    } catch (err) {
      console.error('[AdmissionDetailPage] Error fetching referral details:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load admission details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveId, user?.facilityId]);

  useEffect(() => {
    fetchReferralDetails();
  }, [fetchReferralDetails]);

  // Operational Ward Admission transition (from PATIENT_ARRIVED to IN_PROGRESS)
  const handleQuickAdmit = async () => {
    if (!referral) return;
    try {
      setRefreshing(true);
      await hospitalService.confirmReceivingAdmission(referral.id, {
        progress_notes: 'Patient formally admitted to assigned hospital ward and inpatient clinical care initiated.',
        allocated_ward_department: referral.allocated_ward_department || 'General Inpatient Ward',
        assigned_bed_type: referral.assigned_bed_type || 'STANDARD'
      });
      setActionSuccess('Patient operational ward admission confirmed successfully.');
      await fetchReferralDetails(true);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to confirm ward admission');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdmissionSkeleton count={3} />
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-200 mb-1">
            Unable to Load Admission Record
          </h2>
          <p className="text-sm text-rose-700 dark:text-rose-300 max-w-md mx-auto mb-6">
            {error || 'The requested admission record could not be found or access was restricted.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/admissions"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admissions</span>
            </Link>
            <button
              onClick={() => fetchReferralDetails(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const patientName = referral.patient_name || `${referral.patient_first_name || ''} ${referral.patient_father_name || ''}`.trim() || 'Patient';
  const maskedId = formatPatientId(referral.patient_national_id || referral.patient_mrn || referral.patient_id);
  const statusNorm = String(referral.status || '').toUpperCase();
  const isArrived = statusNorm === 'PATIENT_ARRIVED' || statusNorm === 'ARRIVED';
  const isInProgress = statusNorm === 'IN_PROGRESS';
  const isCompleted = statusNorm === 'COMPLETED';
  const isClosed = statusNorm === 'CLOSED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <Link to="/admissions" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          Inpatient Admissions
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {referral.reference_number || referral.id}
        </span>
      </nav>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-1 rounded-md">
                {referral.reference_number || referral.id}
              </span>
              <HospitalPriorityBadge priority={referral.priority} />
              <AdmissionStatusBadge status={referral.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {patientName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>National ID/MRN: <strong className="font-mono text-slate-700 dark:text-slate-300">{maskedId}</strong></span>
              <span>Age/Gender: <strong>{referral.patient_age_years ? `${referral.patient_age_years} yrs` : 'N/A'}, {referral.patient_gender || 'Unknown'}</strong></span>
              <span>Origin: <strong>{referral.origin_facility_name || referral.origin_facility_id}</strong></span>
            </p>
          </div>

          {/* Action Button Strip */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchReferralDetails(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-lg transition-colors"
              title="Refresh Record"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Quick Admit: Transition PATIENT_ARRIVED to IN_PROGRESS */}
            {isArrived && (
              <button
                type="button"
                onClick={handleQuickAdmit}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Confirm Ward Admission</span>
              </button>
            )}

            {/* Department Assignment */}
            {!isClosed && (
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 rounded-lg shadow-sm transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>{referral.allocated_ward_department ? 'Reassign Dept' : 'Assign Department'}</span>
              </button>
            )}

            {/* Update Progress */}
            {(isInProgress || isArrived) && (
              <button
                type="button"
                onClick={() => setShowProgressModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Record Care Progress</span>
              </button>
            )}

            {/* Complete Referral */}
            {(isInProgress || isArrived) && (
              <button
                type="button"
                onClick={() => setShowCompleteModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete Referral</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Admission & Placement Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'progress'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Care Progress & Follow-ups ({followUps.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`text-xs font-semibold pb-1 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Audit History & Status Log
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Admission & Department Cards */}
          <div className="lg:col-span-2 space-y-6">
            {/* Operational Inpatient Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Bed className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Inpatient Ward & Bed Placement</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Allocated Department</span>
                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>{referral.allocated_ward_department || 'Pending Department Assignment'}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Bed Classification</span>
                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>{referral.assigned_bed_type || 'Standard Inpatient Ward'}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Physical Arrival Time</span>
                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{referral.arrived_at ? formatClinicalDate(referral.arrived_at) : 'Arrival Confirmed'}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Attending Clinician / Staff</span>
                  <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <User className="w-4 h-4 text-slate-500" />
                    <span>
                      {referral.receiving_clinician_first_name
                        ? `Dr. ${referral.receiving_clinician_first_name} ${referral.receiving_clinician_last_name || ''}`
                        : 'Assigned Hospital Specialist Team'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Latest Clinical Progress Notes */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                  Current Operational Care Status & Progress
                </span>
                <p className="text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50 leading-relaxed">
                  {referral.current_progress_notes || 'Patient received at tertiary facility. Inpatient clinical evaluation and specialist management underway.'}
                </p>
              </div>
            </div>

            {/* Referring Clinical Background (Read-Only) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Referring Health Centre Documentation</span>
              </h2>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Primary Diagnosis</span>
                  <p className="text-slate-900 dark:text-slate-100 font-medium">
                    {referral.primary_diagnosis || 'None specified'}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Clinical Referral Reason</span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {referral.reason_for_referral || 'Urgent specialist referral'}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-semibold">Clinical Case Summary</span>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg leading-relaxed">
                    {referral.clinical_summary || 'No detailed clinical summary provided.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Vitals & Operational Safeguards */}
          <div className="space-y-6">
            {/* Triage Vitals on Referral */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                Referral Intake Vitals
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Blood Pressure:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.vitals_blood_pressure || '—'} mmHg</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Pulse Rate:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.vitals_pulse_rate ? `${referral.vitals_pulse_rate} bpm` : '—'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Respiratory Rate:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.vitals_respiratory_rate ? `${referral.vitals_respiratory_rate} /min` : '—'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Body Temperature:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.vitals_temperature ? `${referral.vitals_temperature} °C` : '—'}</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-slate-500">Oxygen Saturation:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.vitals_spo2 ? `${referral.vitals_spo2}%` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Tenancy & Security Safeguard Card */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Hospital Tenancy & Data Isolation</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Referral coordination is protected by facility isolation. Only authorized clinicians at{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {referral.destination_facility_name || user?.facilityName || 'this hospital'}
                </strong>{' '}
                can modify department assignments, log clinical care progress, and conclude referrals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Follow-ups Tab */}
      {activeTab === 'progress' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Care Progress Events & Coordination Notes
            </h2>
            {(isInProgress || isArrived) && (
              <button
                type="button"
                onClick={() => setShowProgressModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            )}
          </div>

          {followUps.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No additional care progress events recorded yet. Click "Add Note" to log an operational milestone or consult update.
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((item, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.outcome || item.interaction_type || 'Care Update'}
                    </span>
                    <span className="text-slate-400">
                      {item.created_at ? formatRelativeTime(item.created_at) : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {item.reason_or_notes || item.notes || 'Progress recorded'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Referral Operational Status Transitions
          </h2>
          <div className="space-y-3">
            {(referral.status_history || []).map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-700/50 text-xs">
                <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Transitioned to: {step.to_status}
                    </span>
                    <span className="text-slate-400">
                      {step.created_at ? formatClinicalDate(step.created_at) : ''}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    {step.reason_text || 'Status updated'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
