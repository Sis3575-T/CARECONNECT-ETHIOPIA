import React, { useState } from 'react';
import {
  CornerDownLeft,
  Building2,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  ShieldCheck,
  User,
  FileText,
  AlertOctagon,
  Calendar
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

const SCHEDULE_OPTIONS = [
  { value: '3_DAYS', label: 'Within 3 days (Early Primary Review)' },
  { value: '1_WEEK', label: '1 Week (Standard Health Centre Check)' },
  { value: '2_WEEKS', label: '2 Weeks (Follow-up & Suture / Dressing Review)' },
  { value: '1_MONTH', label: '1 Month (Chronic Disease Regimen Review)' },
  { value: 'PRN', label: 'As needed (PRN) / If symptoms re-emerge' }
];

export function ReturnToReferrerModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [counterInstructions, setCounterInstructions] = useState('');
  const [ongoingPrescriptions, setOngoingPrescriptions] = useState('');
  const [redFlags, setRedFlags] = useState('');
  const [reviewSchedule, setReviewSchedule] = useState('1_WEEK');
  const [clinicianSignature, setClinicianSignature] = useState(
    user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Hospital Attending Specialist')
  );
  const [confirmedByClinician, setConfirmedByClinician] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !referral) return null;

  const originFacilityName = referral.origin_facility?.name || referral.origin_facility_name || 'Primary Health Centre';
  const patientName = referral.patient?.full_name || referral.patient?.name || referral.patient_name || 'Patient';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!confirmedByClinician) {
      setErrorMessage('You must confirm the counter-referral authorization.');
      return;
    }

    if (!counterInstructions.trim() || counterInstructions.trim().length < 10) {
      setErrorMessage('Please provide detailed counter-referral clinical instructions for the primary health centre (minimum 10 characters).');
      return;
    }

    if (!clinicianSignature.trim()) {
      setErrorMessage('Attending clinician signature is required.');
      return;
    }

    // Tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You are not authorized to manage referrals assigned to another hospital.');
      return;
    }

    setSubmitting(true);
    try {
      const fullInstructions = [
        `Primary Care Instructions: ${counterInstructions.trim()}`,
        ongoingPrescriptions.trim() ? `Ongoing Regimen: ${ongoingPrescriptions.trim()}` : '',
        redFlags.trim() ? `Red Flag Indicators: ${redFlags.trim()}` : '',
        `Recommended Health Centre Visit: ${reviewSchedule}`
      ].filter(Boolean).join('\n\n');

      const payload = {
        outcome_notes: `Patient treated and stabilized; counter-referred to ${originFacilityName} for local continuation of care.`,
        counter_referral_instructions: fullInstructions,
        counter_referral_summary: counterInstructions.trim(),
        instructions: fullInstructions,
        review_schedule: reviewSchedule,
        clinician_signature: clinicianSignature.trim()
      };

      const updated = await hospitalService.recordReturnToReferrer(referral.id, payload);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('[ReturnToReferrerModal] Error:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to submit return-to-referrer documentation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-modal-title"
      data-testid="return-to-referrer-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
              <CornerDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 id="return-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Return to Referring Health Centre (Counter-Referral)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{patientName}</span> ({referral.referral_code || `REF-${referral.id}`})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Referring Health Centre Notice Card */}
          <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl flex items-start gap-3">
            <Building2 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-semibold text-sky-900 dark:text-sky-100">
                Target Health Centre: {originFacilityName}
              </div>
              <p className="text-sky-700 dark:text-sky-300">
                The counter-referral care plan and clinical instructions will immediately be transmitted to the health officers and clinical team at {originFacilityName}.
              </p>
            </div>
          </div>

          {/* Clinical Counter-Referral Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Counter-Referral Care Plan for Health Centre Team *
            </label>
            <textarea
              rows={4}
              value={counterInstructions}
              onChange={(e) => setCounterInstructions(e.target.value)}
              placeholder="Outline specific guidance for primary care staff: vital checks, wound care, medication titration, localized observation..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              required
            />
            <span className="text-[11px] text-slate-400">
              Minimum 10 characters instructing primary care providers on post-hospital management.
            </span>
          </div>

          {/* Ongoing Medications / Dispensary Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Ongoing Medication & Regimen (For HC Pharmacy Refill)
            </label>
            <textarea
              rows={2}
              value={ongoingPrescriptions}
              onChange={(e) => setOngoingPrescriptions(e.target.value)}
              placeholder="List maintenance medications to be refilled or monitored at the health centre..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          {/* Red Flag Warning Signs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Red Flag Warning Signs (Mandating Immediate Re-Referral)</span>
            </label>
            <input
              type="text"
              value={redFlags}
              onChange={(e) => setRedFlags(e.target.value)}
              placeholder="e.g. High fever > 38.5C, persistent shortness of breath, wound dehiscence, neurological decline..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Review Schedule */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Recommended Health Centre Visit Schedule</span>
            </label>
            <select
              value={reviewSchedule}
              onChange={(e) => setReviewSchedule(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            >
              {SCHEDULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Attending Clinician Signature */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Attending Clinician Signature & Attribution *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={clinicianSignature}
                onChange={(e) => setClinicianSignature(e.target.value)}
                placeholder="Dr. / Specialist Full Name"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                required
              />
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={confirmedByClinician}
                onChange={(e) => setConfirmedByClinician(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  I authorize counter-referral to {originFacilityName}.
                </strong>{' '}
                I confirm that tertiary specialist management is concluded and primary healthcare follow-up instructions are documented.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !confirmedByClinician}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {submitting ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Counter-Referral...</span>
                </>
              ) : (
                <>
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Authorize Counter-Referral</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReturnToReferrerModal;
