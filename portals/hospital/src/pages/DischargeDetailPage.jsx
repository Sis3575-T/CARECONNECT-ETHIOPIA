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
  LogOut,
  Share2,
  CornerDownLeft,
  Activity,
  AlertCircle,
  Award
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import { hospitalService } from '../services/hospitalService.js';
import { DischargeStatusBadge } from '../components/discharge/DischargeStatusBadge.jsx';
import { DischargeSkeleton } from '../components/discharge/DischargeSkeleton.jsx';
import { HospitalPriorityBadge } from '../components/HospitalPriorityBadge.jsx';
import { DischargeDocumentationModal } from '../components/discharge/DischargeDocumentationModal.jsx';
import { InterFacilityTransferModal } from '../components/discharge/InterFacilityTransferModal.jsx';
import { useHospitalRealtime } from '../hooks/useHospitalRealtime.js';

export default function DischargeDetailPage() {
  const { referralId, id } = useParams();
  const effectiveId = referralId || id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [referral, setReferral] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [reassignments, setReassignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'outcome' | 'history'

  // Modals visibility state
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchDischargeDetails = useCallback(async (isRefresh = false) => {
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
        throw new Error('Access denied: You are only authorized to view discharge cases for your hospital.');
      }

      setReferral(data);

      // Load coordination follow-ups / history
      try {
        const historyRes = await hospitalService.getFollowUpHistory(effectiveId);
        setFollowUps(Array.isArray(historyRes) ? historyRes : (historyRes?.followUps || []));
      } catch {
        // Non-blocking fallback
      }

      // Load transfer / reassignment history
      try {
        const reassignList = await hospitalService.getReassignments(effectiveId);
        setReassignments(Array.isArray(reassignList) ? reassignList : []);
      } catch {
        // Non-blocking fallback
      }
    } catch (err) {
      console.error('[DischargeDetailPage] Error loading discharge details:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to load discharge dossier');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveId, user?.facilityId]);

  useEffect(() => {
    fetchDischargeDetails();
  }, [fetchDischargeDetails]);

  // Real-time telemetry: auto-refresh when referral status changes
  useHospitalRealtime({
    onReferralUpdated: (evt) => {
      if (evt?.referralId === effectiveId || evt?.id === effectiveId) {
        fetchDischargeDetails(true);
      }
    }
  });

  if (loading && !referral) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 animate-pulse"></div>
        <DischargeSkeleton count={4} />
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center" role="alert">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Access Denied or Case Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
          {error || 'The requested patient discharge record could not be located in this hospital context.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/discharges')}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
          >
            Return to Discharge Workspace
          </button>
          <button
            type="button"
            onClick={() => fetchDischargeDetails(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const patient = referral.patient || {};
  const maskedFaydaId = patient.national_id_masked ||
    (patient.fayda_id ? `••••-••••-${patient.fayda_id.slice(-4)}` : null) ||
    (referral.fayda_id ? `••••-••••-${referral.fayda_id.slice(-4)}` : '••••-••••-0000');

  const isCompleted = referral.status === 'COMPLETED' || referral.status === 'CLOSED';
  const isTransferred = referral.status === 'TRANSFERRED' || reassignments.length > 0;
  const isCounterReferred = referral.completion_reason === 'RETURNED_TO_REFERRING_FACILITY' || Boolean(referral.counter_referral_instructions);
  const isEligibleForDischarge = !isCompleted && !isTransferred;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" data-testid="discharge-detail-page">
      {/* Navigation breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/discharges"
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Back to discharge workspace"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                {referral.referral_code || `REF-${referral.id}`}
              </span>
              <DischargeStatusBadge
                status={referral.status}
                isTransferred={isTransferred}
                isCounterReferred={isCounterReferred}
              />
              <HospitalPriorityBadge priority={referral.priority} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
              Patient Discharge & Transfer Dossier
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDischargeDetails(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-200 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-xs font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Patient Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Patient Full Name</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-400" />
              <span>{patient.full_name || patient.name || referral.patient_name || 'Anonymous Patient'}</span>
            </div>
            <span className="inline-block text-xs font-mono text-slate-500 dark:text-slate-400">
              Fayda ID: {maskedFaydaId}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Demographics</span>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {patient.age ? `${patient.age} yrs` : 'Age N/A'} • {patient.gender || 'Unknown'}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Phone: {patient.phone_number || 'Confidential'}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Originating Facility</span>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{referral.origin_facility?.name || referral.origin_facility_name || 'Primary Health Centre'}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Admission Bed: {referral.assigned_bed_type || 'Standard Ward'} ({referral.allocated_ward_department || 'General Inpatient'})
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Admission / Arrival Date</span>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{formatClinicalDate(referral.arrival_confirmed_at || referral.admitted_at || referral.created_at)}</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Stay Duration: {formatRelativeTime(referral.arrival_confirmed_at || referral.admitted_at || referral.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {isEligibleForDischarge
              ? 'Authorized Clinician Action Required: Select appropriate discharge, transfer or return disposition'
              : 'Referral case disposition has been authorized and documented'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Discharge Button */}
          <button
            type="button"
            onClick={() => setShowDischargeModal(true)}
            disabled={!isEligibleForDischarge}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
              isEligibleForDischarge
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Authoritative Discharge</span>
          </button>

          {/* Transfer Button */}
          <button
            type="button"
            onClick={() => setShowTransferModal(true)}
            disabled={!isEligibleForDischarge}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
              isEligibleForDischarge
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Inter-Facility Transfer</span>
          </button>

          {/* Return to Referrer Button */}
          <button
            type="button"
            onClick={() => setShowReturnModal(true)}
            disabled={!isEligibleForDischarge}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors ${
              isEligibleForDischarge
                ? 'bg-sky-600 hover:bg-sky-700 text-white'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
            <span>Return to Referrer (HC)</span>
          </button>

          {/* Patient Outcome Button */}
          <button
            type="button"
            onClick={() => setShowOutcomeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg shadow-sm transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Document Outcome</span>
          </button>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-6" aria-label="Discharge Workspace Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Clinical Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('outcome')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'outcome'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Outcome & Disposition</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Chronological Audit Trail ({followUps.length + reassignments.length})</span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Clinical Impression */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Primary Clinical Impression</span>
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {referral.reason_for_referral || referral.clinical_impression || 'No primary referral impression documented.'}
              </p>
            </div>

            {/* Department Care & Current Bed */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Bed className="w-4 h-4 text-indigo-600" />
                <span>Inpatient Department & Bed Allocation</span>
              </h3>
              <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium">{referral.allocated_ward_department || 'General Inpatient'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Bed Type:</span>
                  <span className="font-medium">{referral.assigned_bed_type || 'Standard Ward'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Latest Progress Note:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-400 truncate max-w-xs">
                    {referral.progress_notes || referral.review_notes || 'Stable under specialized monitoring'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'outcome' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Documented Patient Outcome & Discharge Summary</span>
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-700 dark:text-slate-300 space-y-3">
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block">Outcome Category</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {referral.completion_reason || referral.outcome || 'Pending Official Outcome Documentation'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wide block">Clinical Outcome Summary / Instructions</span>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {referral.outcome_notes || referral.counter_referral_instructions || 'No outcome summary recorded yet.'}
              </p>
            </div>
            {referral.counter_referral_instructions && (
              <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-md">
                <span className="text-xs font-semibold text-sky-800 dark:text-sky-300 block mb-1">
                  Counter-Referral Instructions for Health Centre:
                </span>
                <p className="text-xs text-sky-900 dark:text-sky-200">
                  {referral.counter_referral_instructions}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Chronological Audit Trail</span>
          </h3>
          {followUps.length === 0 && reassignments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No historical coordination or transfer events logged yet.
            </p>
          ) : (
            <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
              {followUps.map((fu, idx) => (
                <div key={idx} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {fu.outcome || 'EVENT'}
                    </span>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{fu.reason_or_notes || fu.notes}</p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {formatClinicalDate(fu.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discharge Documentation Modal */}
      <DischargeDocumentationModal
        isOpen={showDischargeModal}
        onClose={() => setShowDischargeModal(false)}
        referral={referral}
        onSuccess={(updated) => {
          if (updated) setReferral(prev => ({ ...prev, ...updated, status: 'COMPLETED' }));
          setActionSuccess('Discharge documentation authorized and patient successfully discharged.');
          fetchDischargeDetails(true);
        }}
      />

      {/* Inter-Facility Transfer Modal */}
      <InterFacilityTransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        referral={referral}
        onSuccess={(updated) => {
          if (updated) setReferral(prev => ({ ...prev, ...updated, status: 'TRANSFERRED' }));
          setActionSuccess('Inter-facility transfer authorized and initiated successfully.');
          fetchDischargeDetails(true);
        }}
      />
    </div>
  );
}
