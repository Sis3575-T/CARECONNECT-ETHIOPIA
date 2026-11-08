import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Truck,
  CheckCircle2,
  Clock,
  Building,
  FileText,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Flame,
  Stethoscope,
  ClipboardCheck,
  Bed
} from 'lucide-react';
import { hospitalService } from '../services/hospitalService.js';
import { useHospitalRealtime } from '../hooks/useHospitalRealtime.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import HospitalPriorityBadge from '../components/HospitalPriorityBadge.jsx';
import ArrivalStatusBadge from '../components/arrival/ArrivalStatusBadge.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';
import ArrivalSkeleton from '../components/arrival/ArrivalSkeleton.jsx';
import PatientIdentityVerification from '../components/arrival/PatientIdentityVerification.jsx';
import PatientHandoverSection from '../components/arrival/PatientHandoverSection.jsx';
import PatientArrivalModal from '../components/arrival/PatientArrivalModal.jsx';

export default function PatientArrivalDetailPage() {
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

  // Active step / modal views for arrival workflow
  const [activeModal, setActiveModal] = useState(null); // 'ARRIVE' | 'HANDOVER' | 'CONFIRM_RECEIPT' | null
  const [verificationState, setVerificationState] = useState({
    isVerified: false,
    hasMismatch: false,
    mismatchNotes: '',
    checklist: {}
  });

  const fetchArrivalDossier = useCallback(async (isSilent = false) => {
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
      console.error('[PatientArrivalDetail] Load error:', err);
      setError(err?.message || 'Failed to retrieve arrival dossier');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchArrivalDossier();
  }, [fetchArrivalDossier]);

  const { isLiveConnected, triggerSync: triggerLiveSync } = useHospitalRealtime({
    referralId,
    onEventReceived: () => {
      fetchArrivalDossier(true);
    },
    pollingIntervalMs: 25000,
    enabled: Boolean(referralId)
  });

  const handleActionComplete = async (msg) => {
    setActiveModal(null);
    setActionSuccess(msg);
    await fetchArrivalDossier(true);
  };

  if (loading) {
    return <ArrivalSkeleton />;
  }

  if (error && !referral) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <HospitalErrorState
          title="Arrival dossier inaccessible"
          message={error || 'Unable to load arrival details. Verify your hospital facility context.'}
          onRetry={() => fetchArrivalDossier()}
        />
        <div className="text-center mt-4">
          <Link
            to="/arrivals"
            className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Patient Arrivals Queue</span>
          </Link>
        </div>
      </div>
    );
  }

  const refCode = referral?.reference_number || referral?.id;
  const isEmergency = (referral?.priority || '').toUpperCase() === 'EMERGENCY';
  const statusUpper = (referral?.status || '').toUpperCase();

  // Workflow phase checks
  const isAwaitingPhysicalArrival = ['ACCEPTED', 'TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'DISPATCHED'].includes(statusUpper);
  const hasArrivedPendingHandover = statusUpper === 'PATIENT_ARRIVED' || statusUpper === 'ARRIVED';
  const isReceivedAndAdmitted = statusUpper === 'IN_PROGRESS';

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/arrivals"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Return to Arrivals Queue"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Arrivals Queue</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {refCode}
              </span>
              <HospitalPriorityBadge priority={referral?.priority} />
              <ArrivalStatusBadge status={referral?.status} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Patient Arrival, Handover & Receiving Workspace &bull; Origin: <strong>{referral?.origin_facility_name || 'Referring Health Centre'}</strong>
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2">
          {isAwaitingPhysicalArrival && (
            <button
              onClick={() => setActiveModal('ARRIVE')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Record Patient Arrival</span>
            </button>
          )}

          {hasArrivedPendingHandover && (
            <>
              <button
                onClick={() => setActiveModal('HANDOVER')}
                className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Document Handover</span>
              </button>
              <button
                onClick={() => setActiveModal('CONFIRM_RECEIPT')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Receipt & Admit</span>
              </button>
            </>
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

      {/* Success Notification Alert */}
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

      {/* High Acuity Transfer Warning */}
      {isEmergency && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-600 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <Flame className="w-6 h-6 text-rose-600 shrink-0 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Emergency Transfer Arrival
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              High-acuity emergency case. Immediately alert acute triage nurses and prepare receiving resuscitation bay.
            </p>
          </div>
        </div>
      )}

      {/* Four-Step Visual Progress Stepper */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Patient Receiving & Admission Lifecycle</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 dark:text-emerald-200">1. Referral Accepted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-1">Bed allocated & hospital ready</p>
          </div>

          <div className={`p-3 rounded-xl border ${
            hasArrivedPendingHandover || isReceivedAndAdmitted
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold ${hasArrivedPendingHandover || isReceivedAndAdmitted ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                2. Physical Arrival
              </span>
              {hasArrivedPendingHandover || isReceivedAndAdmitted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Clock className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {referral?.arrived_at ? `Arrived ${formatRelativeTime(referral.arrived_at)}` : 'Awaiting physical transit'}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            isReceivedAndAdmitted
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
              : hasArrivedPendingHandover
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold ${isReceivedAndAdmitted ? 'text-emerald-800 dark:text-emerald-200' : hasArrivedPendingHandover ? 'text-blue-800 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300'}`}>
                3. Clinical Handover
              </span>
              {isReceivedAndAdmitted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : hasArrivedPendingHandover ? (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              ) : (
                <Clock className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {hasArrivedPendingHandover ? 'Ready for escort handover' : 'Pending patient arrival'}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${
            isReceivedAndAdmitted
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold ${isReceivedAndAdmitted ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                4. Receiving & Admission
              </span>
              {isReceivedAndAdmitted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <Clock className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              {isReceivedAndAdmitted ? 'Admitted to Ward' : 'Final hospital receiving'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Workspace Container */}
      <div id="arrival-workflow-content" className="space-y-6">
        {/* Step 1: Patient Identity Verification Protocol */}
        <PatientIdentityVerification
          referral={referral}
          onVerificationChange={setVerificationState}
          isVerified={verificationState.isVerified}
          mismatchReported={verificationState.hasMismatch}
        />

        {/* Step 2: Patient Handover & Transfer Documentation */}
        <PatientHandoverSection
          referral={referral}
          onHandoverRecorded={() => fetchArrivalDossier(true)}
          isLocked={verificationState.hasMismatch}
        />
      </div>

      {/* Arrival Action Modals */}
      <PatientArrivalModal
        isOpen={activeModal === 'ARRIVE'}
        onClose={() => setActiveModal(null)}
        referral={referral}
        isVerified={verificationState.isVerified}
        onSuccess={(_, msg) => handleActionComplete(msg)}
      />
    </div>
  );
}
