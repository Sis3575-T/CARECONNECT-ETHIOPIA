import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  RefreshCw,
  Building2,
  User,
  Stethoscope,
  Activity,
  Ambulance,
  Phone,
  Calendar,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { referralTrackingService } from '../services/referralTrackingService.js';
import { ReferralTrackingErrorState } from '../components/referrals/ReferralTrackingErrorState.jsx';
import { ReferralStatusBadge } from '../components/referrals/ReferralStatusBadge.jsx';
import { ReferralPriorityBadge } from '../components/referrals/ReferralPriorityBadge.jsx';
import { ReferralStatusTimeline } from '../components/referrals/ReferralStatusTimeline.jsx';
import { HospitalResponseCard } from '../components/referrals/HospitalResponseCard.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export default function ReferralDetailPage() {
  const { referralId } = useParams();
  const navigate = useNavigate();

  const [referral, setReferral] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  const loadReferralData = async () => {
    if (!referralId) return;
    setLoading(true);
    setError(null);
    try {
      const refData = await referralTrackingService.getReferralById(referralId);
      setReferral(refData);

      // Load timeline in parallel
      setLoadingTimeline(true);
      referralTrackingService
        .getReferralTimeline(referralId)
        .then((tl) => setTimeline(tl || []))
        .catch(() => setTimeline([]))
        .finally(() => setLoadingTimeline(false));
    } catch (err) {
      setError(err.message || 'Failed to retrieve referral details.');
      setStatusCode(err.status || err.statusCode || 500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferralData();
  }, [referralId]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Spinner size="lg" className="mx-auto mb-2 text-sky-600" />
        <p className="text-xs text-slate-500">Querying referral record and audit logs...</p>
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="py-12">
        <ReferralTrackingErrorState
          error={error || 'Referral record not found.'}
          statusCode={statusCode}
          onRetry={loadReferralData}
          onBack={() => navigate('/referrals')}
        />
      </div>
    );
  }

  const referenceCode = referral.reference_number || referral.referral_code || referral.id;
  const patientName =
    referral.patient_name ||
    referral.patient_full_name ||
    [referral.patient_first_name, referral.patient_father_name].filter(Boolean).join(' ') ||
    'Patient Record';

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-4">
      {/* Back and Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={() => navigate('/referrals')}
            className="inline-flex items-center text-xs text-slate-500 hover:text-sky-600 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Referrals Tracker
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {referenceCode}
            </h1>
            <ReferralStatusBadge status={referral.status} />
            <ReferralPriorityBadge priority={referral.priority} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Submitted on {formatClinicalDate(referral.created_at)} ({formatRelativeTime(referral.created_at)})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {referral.patient_id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/patients/${referral.patient_id}`)}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>View Patient Profile</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadReferralData}
            className="text-xs inline-flex items-center gap-1.5"
            aria-label="Refresh referral data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Overview & Details Left, Timeline Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Clinical & Transfer Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hospital Response & Decision Visibility Banner */}
          <HospitalResponseCard referral={referral} />

          {/* Patient Demographic Summary Card */}
          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-600" />
                <span>Patient Demographics</span>
              </h3>
              {referral.patient_id && (
                <span className="font-mono text-[11px] text-slate-400">
                  ID: {referral.patient_id}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Full Patient Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{patientName}</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Gender & Age</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {referral.patient_gender || referral.gender || '—'} {referral.patient_age ? `(${referral.patient_age} yrs)` : ''}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Phone Contact</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {referral.patient_phone || 'None listed'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Fayda National ID</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {referral.patient_national_id || 'Not specified'}
                </span>
              </div>
            </div>
          </Card>

          {/* Clinical Presentation & Vitals */}
          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span>Clinical Referral Information</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Primary Diagnosis / Impression</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {referral.primary_diagnosis || 'Not specified'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Reason for Referral</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {referral.reason_for_referral || 'Not specified'}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[11px] text-slate-400 block">Clinical Summary & Presentation</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed whitespace-pre-wrap">
                  {referral.clinical_summary || 'No summary text entered.'}
                </p>
              </div>
            </div>

            {/* Vitals Summary */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Recorded Vital Observations
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {referral.vitals_blood_pressure || '--/--'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">mmHg</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {referral.vitals_pulse_rate || '--'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">bpm</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Resp Rate</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {referral.vitals_respiratory_rate || '--'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">breaths/min</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Temperature</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {referral.vitals_temperature || '--'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">°C</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">SpO2 Oxygen</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {referral.vitals_spo2 ? `${referral.vitals_spo2}%` : '--%'}
                  </span>
                  <span className="text-[9px] text-slate-400 block">Saturation</span>
                </div>
              </div>
            </div>

            {/* Provisional Treatment & Ambulance */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Provisional Treatment Administered</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                  {referral.provisional_treatment_given || 'No provisional treatment documented.'}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Transport Requirement</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {referral.transport_required ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                      <Ambulance className="w-3.5 h-3.5" />
                      Ambulance Dispatch Required
                    </span>
                  ) : (
                    <span className="text-slate-500">Standard / Self-transfer</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Destination Hospital Information */}
          <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Destination Hospital Assignment</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Receiving Facility</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {referral.destination_facility_name || 'Hospital ID: ' + referral.destination_facility_id}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Region: {referral.destination_region || 'Ethiopia'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Target Specialty Department</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {referral.required_specialty || 'General Triage / Admitting'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Unified Chronological Timeline */}
        <div className="space-y-6">
          <ReferralStatusTimeline
            timelineEvents={timeline}
            loading={loadingTimeline}
          />
        </div>
      </div>
    </div>
  );
}
