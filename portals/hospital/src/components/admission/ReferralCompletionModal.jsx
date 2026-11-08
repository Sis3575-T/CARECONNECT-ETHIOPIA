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
  ArrowRight,
  Archive,
  Info
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

const COMPLETION_REASONS = [
  {
    value: 'SPECIALIST_CARE_DELIVERED',
    label: 'Specialist Intervention Concluded',
    desc: 'Tertiary clinical consultation, surgery, or specialist management successfully rendered.'
  },
  {
    value: 'STABILIZED_AND_COUNTER_REFERRED',
    label: 'Stabilized & Counter-Referred',
    desc: 'Acute phase resolved; patient referred back to primary health centre with care plan.'
  },
  {
    value: 'TRANSFERRED_EXTERNAL',
    label: 'Transferred to Specialized Institute',
    desc: 'Patient referred onward to super-specialized national institute or specialty hospital.'
  },
  {
    value: 'PATIENT_SELF_DISCHARGED',
    label: 'Discharged on Request / Non-Clinical',
    desc: 'Patient, family, or guardian opted for self-discharge against medical advice.'
  }
];

export function ReferralCompletionModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [completionReason, setCompletionReason] = useState('SPECIALIST_CARE_DELIVERED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [counterReferralNotes, setCounterReferralNotes] = useState('');
  const [clinicianSignature, setClinicianSignature] = useState(
    user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Hospital Attending Specialist')
  );
  const [autoCloseDossier, setAutoCloseDossier] = useState(false);
  const [confirmedByClinician, setConfirmedByClinician] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !referral) return null;

  // Pre-completion validation checks
  const hasDepartment = Boolean(referral.allocated_ward_department && referral.allocated_ward_department !== 'Unassigned');
  const isEligible = ['IN_PROGRESS', 'PATIENT_ARRIVED', 'ARRIVED'].includes((referral.status || '').toUpperCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!confirmedByClinician) {
      setErrorMessage('You must explicitly confirm that specialist referral care conditions have been satisfied.');
      return;
    }

    if (!outcomeNotes.trim() || outcomeNotes.trim().length < 10) {
      setErrorMessage('Please provide comprehensive clinical outcome summary notes (minimum 10 characters).');
      return;
    }

    // Tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You are not authorized to complete referrals assigned to another hospital.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        outcome_notes: outcomeNotes.trim(),
        completion_reason: completionReason,
        counter_referral_instructions: counterReferralNotes.trim() || null,
        clinician_signature: clinicianSignature.trim(),
        actual_completion_time: new Date().toISOString()
      };

      let updated = await hospitalService.completeReferral(referral.id, payload);

      // If user also checked administrative closure, immediately close
      if (autoCloseDossier) {
        try {
          updated = await hospitalService.closeReferral(referral.id, {
            closure_reason: `Completed: ${payload.completion_reason}. Administrative discharge dossier closed.`
          });
        } catch (closeErr) {
          console.warn('[ReferralCompletionModal] Auto-close failed, but referral completed:', closeErr);
        }
      }

      if (onSuccess) {
        onSuccess(updated, 'Referral workflow completed successfully.');
      }
      onClose();
    } catch (err) {
      console.error('[ReferralCompletionModal] Completion error:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to complete referral workflow.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-modal-title"
      data-testid="referral-completion-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="completion-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Complete Hospital Referral Workflow
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Referral: <strong className="font-mono text-slate-700 dark:text-slate-300">{referral.reference_number || referral.id}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Operational Pre-requisite Summary */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Referral Inpatient Summary
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="text-slate-400 block">Department:</span>
                <strong className="text-slate-800 dark:text-slate-200">{referral.allocated_ward_department || 'General Ward'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Current Status:</span>
                <strong className="text-slate-800 dark:text-slate-200">{referral.status}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Target Facility:</span>
                <strong className="text-slate-800 dark:text-slate-200">{referral.destination_facility_name || user?.facilityName || 'Specialized Hospital'}</strong>
              </div>
            </div>
          </div>

          {/* 1. Completion Reason / Outcome Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Clinical Completion Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={completionReason}
              onChange={(e) => setCompletionReason(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {COMPLETION_REASONS.map(r => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <span className="text-2xs text-slate-400 mt-1 block">
              {COMPLETION_REASONS.find(r => r.value === completionReason)?.desc}
            </span>
          </div>

          {/* 2. Outcome Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Specialist Clinical Outcome Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              rows={3}
              placeholder="Summarize the interventions performed, patient response, and specialist conclusion..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* 3. Counter-Referral / Follow-up Guidance for Health Centre */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Counter-Referral Instructions for Referring Health Centre (Optional)
            </label>
            <textarea
              value={counterReferralNotes}
              onChange={(e) => setCounterReferralNotes(e.target.value)}
              rows={2}
              placeholder="Recommended local follow-up schedule, primary wound care, red-flag symptoms to monitor..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* 4. Certifying Clinician */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Certifying Attending Specialist / Medical Officer <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={clinicianSignature}
              onChange={(e) => setClinicianSignature(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* 5. Auto Close Dossier Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="auto-close-dossier"
              checked={autoCloseDossier}
              onChange={(e) => setAutoCloseDossier(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <label htmlFor="auto-close-dossier" className="text-xs text-slate-700 dark:text-slate-300">
              <strong>Close administrative dossier immediately</strong> (transitions status to <code>CLOSED</code> after completion).
            </label>
          </div>

          {/* 6. Explicit Clinician Confirmation */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedByClinician}
                onChange={(e) => setConfirmedByClinician(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-emerald-300"
                required
              />
              <span className="text-xs font-medium text-emerald-900 dark:text-emerald-200">
                I hereby certify that specialist clinical evaluation and inpatient objectives for this referral have been concluded.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !confirmedByClinician}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Completion...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Complete Referral</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReferralCompletionModal;
