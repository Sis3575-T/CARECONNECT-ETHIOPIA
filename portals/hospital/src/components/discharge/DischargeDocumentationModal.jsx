import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  X,
  FileCheck,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  User,
  LogOut,
  Pill,
  AlertOctagon
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

const DISCHARGE_DISPOSITIONS = [
  {
    value: 'ROUTINE_HOME',
    label: 'Routine Discharge Home',
    desc: 'Patient has clinically recovered/improved and is safe for discharge to home environment.'
  },
  {
    value: 'STABILIZED',
    label: 'Clinically Stabilized',
    desc: 'Acute phase managed and stabilized; requires scheduled outpatient clinic follow-up.'
  },
  {
    value: 'SPECIALIST_CARE_DELIVERED',
    label: 'Specialist Intervention Complete',
    desc: 'Targeted surgical, pediatric, or specialist consultative care has concluded.'
  },
  {
    value: 'AGAINST_MEDICAL_ADVICE',
    label: 'Discharge Against Medical Advice (AMA)',
    desc: 'Patient, family, or caregiver elected to depart prior to clinical team approval.'
  }
];

const FOLLOW_UP_OPTIONS = [
  { value: 'NONE', label: 'No routine follow-up needed' },
  { value: '3_DAYS', label: 'Within 3 days (Early Review)' },
  { value: '1_WEEK', label: '1 Week (Standard Review)' },
  { value: '2_WEEKS', label: '2 Weeks' },
  { value: '1_MONTH', label: '1 Month' },
  { value: 'PRN', label: 'As needed (PRN) / Return on red flag warning signs' }
];

export function DischargeDocumentationModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [disposition, setDisposition] = useState('ROUTINE_HOME');
  const [dischargeReason, setDischargeReason] = useState('CLINICALLY_STABLE');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [medications, setMedications] = useState('');
  const [instructions, setInstructions] = useState('');
  const [followUpTimeline, setFollowUpTimeline] = useState('1_WEEK');
  const [clinicianSignature, setClinicianSignature] = useState(
    user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Hospital Attending Specialist')
  );
  const [confirmedByClinician, setConfirmedByClinician] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !referral) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!confirmedByClinician) {
      setErrorMessage('You must verify and confirm the discharge documentation authorization.');
      return;
    }

    if (!clinicalSummary.trim() || clinicalSummary.trim().length < 10) {
      setErrorMessage('Please provide a comprehensive discharge clinical summary (minimum 10 characters).');
      return;
    }

    if (!clinicianSignature.trim()) {
      setErrorMessage('Attending clinician name and signature are required.');
      return;
    }

    // Tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You are not authorized to discharge referrals assigned to another hospital.');
      return;
    }

    setSubmitting(true);
    try {
      const fullInstructions = [
        instructions.trim() ? `Instructions: ${instructions.trim()}` : '',
        medications.trim() ? `Discharge Medications: ${medications.trim()}` : '',
        `Follow-up Schedule: ${followUpTimeline}`
      ].filter(Boolean).join('\n\n');

      const payload = {
        disposition,
        discharge_reason: dischargeReason,
        clinical_summary: clinicalSummary.trim(),
        post_discharge_instructions: fullInstructions,
        medications: medications.trim(),
        follow_up_timeline: followUpTimeline,
        clinician_signature: clinicianSignature.trim()
      };

      const updated = await hospitalService.recordDischarge(referral.id, payload);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('[DischargeDocumentationModal] Submission error:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to record clinical discharge.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = referral.patient?.full_name || referral.patient?.name || referral.patient_name || 'Patient';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="discharge-modal-title"
      data-testid="discharge-documentation-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h2 id="discharge-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Authoritative Hospital Discharge Documentation
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

          {/* Disposition Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Discharge Disposition *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DISCHARGE_DISPOSITIONS.map((opt) => {
                const selected = disposition === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setDisposition(opt.value)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selected
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {selected && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Course / Discharge Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Discharge Clinical Summary & Inpatient Course *
            </label>
            <textarea
              rows={4}
              value={clinicalSummary}
              onChange={(e) => setClinicalSummary(e.target.value)}
              placeholder="Detail the clinical course, diagnostic resolutions, interventions performed, and clinical status at discharge..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
            <span className="text-[11px] text-slate-400">
              Minimum 10 characters detailing patient resolution and condition.
            </span>
          </div>

          {/* Medications & Prescription Regimen */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              <span>Discharge Medications & Regimen (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg PO TID x 7 days; Paracetamol 1g PO QID PRN pain..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Care Instructions & Warning Red Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Post-Discharge Care Instructions
              </label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Wound dressing, hydration, diet, and rest guidance..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Scheduled Follow-up Timeline
              </label>
              <select
                value={followUpTimeline}
                onChange={(e) => setFollowUpTimeline(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {FOLLOW_UP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  I confirm this clinical discharge authorization.
                </strong>{' '}
                I certify that inpatient care objectives are completed and the patient has received safe discharge instructions.
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {submitting ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Discharge...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Authorize & Sign Discharge</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DischargeDocumentationModal;
