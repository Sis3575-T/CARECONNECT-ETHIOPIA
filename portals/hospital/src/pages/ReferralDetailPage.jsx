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
  ExternalLink,
  ShieldCheck,
  Ambulance,
  Phone,
  RefreshCw,
  AlertCircle,
  FileCheck,
  Flame,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { hospitalService } from '../services/hospitalService.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import HospitalStatusBadge from '../components/HospitalStatusBadge.jsx';
import HospitalPriorityBadge from '../components/HospitalPriorityBadge.jsx';
import HospitalErrorState from '../components/HospitalErrorState.jsx';
import HospitalDashboardSkeleton from '../components/HospitalDashboardSkeleton.jsx';

export default function ReferralDetailPage() {
  const { referralId } = useParams();
  const navigate = useNavigate();

  const [referral, setReferral] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchReferralDetails = useCallback(async (isSilent = false) => {
    if (!referralId) return;
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [refData, docsData, timelineData] = await Promise.all([
        hospitalService.getReferralById(referralId),
        hospitalService.getReferralDocuments(referralId),
        hospitalService.getReferralTimeline(referralId)
      ]);

      setReferral(refData);
      setDocuments(docsData || []);
      setTimeline(timelineData || []);
    } catch (err) {
      console.error('[HospitalReferralDetail] Load error:', err);
      setError(err?.message || 'Failed to retrieve referral details from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [referralId]);

  useEffect(() => {
    fetchReferralDetails();
  }, [fetchReferralDetails]);

  if (loading) {
    return <HospitalDashboardSkeleton />;
  }

  if (error || !referral) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <HospitalErrorState
          title="Referral not accessible"
          message={error || 'The requested referral could not be found or your hospital facility is not authorized to inspect it.'}
          onRetry={() => fetchReferralDetails()}
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

  const refCode = referral.reference_number || referral.id;
  const patientName = referral.patient_name || referral.patientName || 'Unnamed Patient';
  const originFacility = referral.origin_facility_name || referral.referringFacility || 'Referring Health Centre';
  const destinationHospital = referral.destination_facility_name || referral.receivingHospital || 'Hospital';
  const requestedService = referral.service_category || referral.service || referral.requested_service || 'General Inpatient';

  // Structured physiological vitals
  const vitals = referral.vitals || {};
  const bp = referral.vitals_blood_pressure || vitals.blood_pressure || 'Not recorded';
  const hr = referral.vitals_heart_rate || vitals.heart_rate || '—';
  const rr = referral.vitals_respiratory_rate || vitals.respiratory_rate || '—';
  const temp = referral.vitals_temperature || vitals.temperature || '—';
  const spo2 = referral.vitals_oxygen_saturation || vitals.oxygen_saturation || '—';

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs pb-16">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/incoming"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Back to Incoming Queue"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Incoming Inbox</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {refCode}
              </span>
              <HospitalPriorityBadge priority={referral.priority} />
              <HospitalStatusBadge status={referral.status} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              Submitted: {referral.submitted_at ? formatClinicalDate(referral.submitted_at) : 'Recently'} ({referral.submitted_at ? formatRelativeTime(referral.submitted_at) : 'Active'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReferralDetails(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Attention Banner if Emergency Urgency */}
      {(referral.priority || '').toUpperCase() === 'EMERGENCY' && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-600 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <Flame className="w-6 h-6 text-rose-600 shrink-0 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              High-Acuity Emergency Transfer Request
            </h2>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
              This patient requires immediate resuscitation readiness. Please review physiological vitals and prepare acute receiving bed.
            </p>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Clinical Presentation, Vitals, Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Demographics Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Patient Identification & Demographics</h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Patient ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{referral.patient_id?.slice(0, 8) || 'N/A'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Full Name</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{patientName}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Biological Sex / Gender</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {referral.patient_gender || referral.gender || 'Not specified'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Age</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {referral.patient_age ? `${referral.patient_age} years` : 'Unrecorded'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Kebele / Woreda</span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {referral.patient_kebele || referral.kebele || 'Local Community'}
                </p>
              </div>
            </div>

            {/* Emergency Contact & National ID (Masked for Privacy) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Fayda National ID:</span>
                <span className="ml-1.5 font-mono text-slate-700 dark:text-slate-300 font-semibold">
                  {referral.patient_fayda_id ? `••••••••${referral.patient_fayda_id.slice(-4)}` : 'Not registered on Fayda'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Contact Telephone:</span>
                <span className="ml-1.5 font-medium text-slate-700 dark:text-slate-300">
                  {referral.patient_phone || 'None provided'}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Presentation & History */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Clinical Referral Information</h2>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Primary Clinical Diagnosis / Reason for Referral
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  {referral.primary_diagnosis || referral.reason_for_referral || 'Clinical diagnosis pending intake'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Presenting Complaint & History of Present Illness
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-line">
                  {referral.clinical_summary || referral.history_and_physical || referral.presenting_complaint || 'No detailed clinical narrative documented.'}
                </p>
              </div>

              {referral.provisional_treatment && (
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Emergency Treatment / Medications Administered at Health Centre
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    {referral.provisional_treatment}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Structured Vital Signs Observations */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Physiological Vital Signs at Transfer</h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Baseline Triage Observations</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Blood Pressure</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{bp}</p>
                <span className="text-[10px] text-slate-500">mmHg</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Heart Rate</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{hr}</p>
                <span className="text-[10px] text-slate-500">bpm</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Resp Rate</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{rr}</p>
                <span className="text-[10px] text-slate-500">breaths/min</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Temperature</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{temp}</p>
                <span className="text-[10px] text-slate-500">°C</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">SpO2 Oxygen</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">{spo2}</p>
                <span className="text-[10px] text-slate-500">%</span>
              </div>
            </div>
          </div>

          {/* Transport & Emergency Transit Logistics */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Ambulance className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Transport & Logistics</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Ambulance Required:</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {referral.transport_required ? 'Yes — Emergency Ambulance Transfer' : 'No — Self or Standard Transit'}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Transit / Logistical Notes:</span>
                <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                  {referral.transport_notes || referral.logistics_notes || 'No special transit requirements recorded.'}
                </p>
              </div>
            </div>
          </div>

          {/* Attached Supporting Diagnostic Documents */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Attached Supporting Diagnostic Documents</h2>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {documents.length} File{documents.length === 1 ? '' : 's'}
              </span>
            </div>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
                No supplementary lab slips or imaging files attached to this referral.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-xs">
                          {doc.file_name || doc.name || 'Clinical Document'}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
                            {doc.document_type || doc.category || 'DIAGNOSTIC'}
                          </span>
                          {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} KB</span>}
                          {doc.created_at && <span>{formatClinicalDate(doc.created_at)}</span>}
                        </div>
                      </div>
                    </div>

                    <a
                      href={doc.file_url || `/api/v1/referrals/${referralId}/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Origin Facility, Destination, Chronological Timeline */}
        <div className="space-y-6">
          {/* Facility & Routing Information */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Inter-Facility Routing</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Referring Health Centre</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{originFacility}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Origin Contact: {referral.referring_clinician_phone || referral.clinician_phone || 'General Dispatch'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Destination Hospital</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{destinationHospital}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Target Clinical Specialty</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{requestedService}</p>
              </div>
            </div>
          </div>

          {/* Chronological Audit Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Referral Audit Timeline</h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Verifiable History</span>
            </div>

            {timeline.length === 0 ? (
              <div className="py-4 text-center text-slate-500 dark:text-slate-400 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-1.5 text-slate-400" />
                <p>Referral submitted by health centre.</p>
                <span className="text-[11px] text-slate-400">
                  {referral.submitted_at ? formatRelativeTime(referral.submitted_at) : 'Active'}
                </span>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {timeline.map((evt, idx) => (
                  <div key={evt.id || idx} className="flex items-start gap-3 relative pl-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-white dark:ring-slate-800 absolute left-2 top-1"></div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        {evt.event_name || evt.event_type || 'Referral Transition'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {evt.created_at ? formatClinicalDate(evt.created_at) : 'Recorded'}
                      </p>
                      {evt.notes && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic mt-0.5">
                          "{evt.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospital Clinical Guidance Notice */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Specialist Triage Governance</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Hospital clinical staff must review all clinical notes and vital signs before confirming admission or allocating acute inpatient beds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
