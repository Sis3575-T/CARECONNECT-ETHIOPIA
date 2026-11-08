import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Calendar,
  Clock,
  User,
  Activity,
  Stethoscope,
  FileText,
  Download,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  RefreshCw,
  Flame,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { hospitalService } from '../services/hospitalService.js';
import { useHospitalRealtime } from '../hooks/useHospitalRealtime.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import HospitalStatusBadge from '../components/HospitalStatusBadge.jsx';
import HospitalPriorityBadge from '../components/HospitalPriorityBadge.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';
import HospitalDashboardSkeleton from '../components/HospitalDashboardSkeleton.jsx';
import ClinicalReviewSummary from '../components/review/ClinicalReviewSummary.jsx';
import ReviewNotesSection from '../components/review/ReviewNotesSection.jsx';

export default function ReferralReviewPage() {
  const { referralId } = useParams();
  const navigate = useNavigate();

  const [referral, setReferral] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  // Active Decision Modals
  const [activeModal, setActiveModal] = useState(null); // 'ACCEPT' | 'REJECT' | 'REQUEST_INFO' | null

  const fetchReferralReviewData = useCallback(async (isSilent = false) => {
    if (!referralId) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [refData, docsData, timelineData, historyRes] = await Promise.all([
        hospitalService.getReferralById(referralId),
        hospitalService.getReferralDocuments(referralId),
        hospitalService.getReferralTimeline(referralId),
        hospitalService.getReferralHistory(referralId)
      ]);

      setReferral(refData);
      setDocuments(docsData || []);
      setTimeline(timelineData || []);
      setHistoryData(historyRes || null);
    } catch (err) {
      console.error('[HospitalReferralReview] Load error:', err);
      setError(err?.message || 'Failed to retrieve referral clinical review dossier');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchReferralReviewData();
  }, [fetchReferralReviewData]);

  // Real-time synchronization hook for this referral review workspace
  const { isLiveConnected, triggerSync: triggerLiveSync } = useHospitalRealtime({
    referralId,
    onEventReceived: () => {
      fetchReferralReviewData(true);
    },
    pollingIntervalMs: 25000,
    enabled: Boolean(referralId)
  });

  const handleAcknowledge = async () => {
    if (!referral || acknowledging) return;
    setAcknowledging(true);
    setError(null);
    try {
      const updated = await hospitalService.acknowledgeReferral(
        referral.id,
        'Incoming referral clinical dossier acknowledged by hospital triage clinician.'
      );
      setReferral(prev => ({ ...prev, ...updated, status: updated?.status || 'ACKNOWLEDGED' }));
      setActionSuccess('Referral successfully acknowledged and marked as under clinical review.');
      await fetchReferralReviewData(true);
    } catch (err) {
      setError(err?.message || 'Failed to acknowledge referral');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleDecisionComplete = async (successMsg) => {
    setActiveModal(null);
    setActionSuccess(successMsg);
    await fetchReferralReviewData(true);
  };

  if (loading) {
    return <HospitalDashboardSkeleton />;
  }

  if (error && !referral) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <HospitalErrorState
          title="Clinical review dossier unavailable"
          message={error || 'Unable to access referral review records. Ensure your facility is authorized for this case.'}
          onRetry={() => fetchReferralReviewData()}
        />
        <div className="text-center mt-4">
          <Link
            to="/incoming"
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Incoming Referral Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  const refCode = referral?.reference_number || referral?.id;
  const isEmergency = (referral?.priority || '').toUpperCase() === 'EMERGENCY';
  const statusUpper = (referral?.status || '').toUpperCase();
  const canDecide = ['SUBMITTED', 'PENDING', 'ACKNOWLEDGED', 'IN_REVIEW', 'INFO_REQUESTED'].includes(statusUpper);
  const canAcknowledge = statusUpper === 'SUBMITTED' || statusUpper === 'PENDING';

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-16">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/referrals/${referralId}`}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Return to Details View"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Case Overview</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {refCode}
              </span>
              <HospitalPriorityBadge priority={referral?.priority} />
              <HospitalStatusBadge status={referral?.status} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Clinical Review & Triage Workspace &bull; Origin: <strong>{referral?.origin_facility_name || 'Referring Health Centre'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Acknowledge Button if newly submitted */}
          {canAcknowledge && (
            <button
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className={`w-3.5 h-3.5 ${acknowledging ? 'animate-spin' : ''}`} />
              <span>{acknowledging ? 'Acknowledging...' : 'Acknowledge Receipt'}</span>
            </button>
          )}

          {/* Quick Decision Action Triggers */}
          {canDecide && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModal('ACCEPT')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accept Case</span>
              </button>
              <button
                onClick={() => setActiveModal('REJECT')}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => setActiveModal('REQUEST_INFO')}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Request Info</span>
              </button>
            </div>
          )}

          <button
            onClick={() => triggerLiveSync(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer"
            title="Synchronize live state"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Success Alert */}
      {actionSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold">{actionSuccess}</p>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Emergency Attention Banner if Emergency Urgency */}
      {isEmergency && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-600 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <Flame className="w-6 h-6 text-rose-600 shrink-0 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              High-Acuity Emergency Transfer Review
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              Physiological distress indicated. Review vitals immediately and confirm specialized resuscitation capacity.
            </p>
          </div>
        </div>
      )}

      {/* Review Dossier Content Layout */}
      <div id="referral-review-dossier" className="space-y-6">
        <ClinicalReviewSummary referral={referral} documents={documents} />
        <ReviewNotesSection referral={referral} />
      </div>
    </div>
  );
}
