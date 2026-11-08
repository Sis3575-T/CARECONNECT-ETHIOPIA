import React, { useState } from 'react';
import {
  Award,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  ShieldCheck,
  User,
  HeartPulse,
  Activity,
  FileCheck
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

export const OUTCOME_CATEGORIES = [
  {
    value: 'CLINICALLY_IMPROVED',
    label: 'Clinically Improved',
    desc: 'Patient showed clear clinical and symptom improvement under hospital management.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  },
  {
    value: 'SPECIALIST_OBJECTIVE_RESOLVED',
    label: 'Specialist Objective Resolved',
    desc: 'The specific specialized consultation, surgery, or diagnostic procedure was completed.',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300'
  },
  {
    value: 'STABILIZED',
    label: 'Stabilized Condition',
    desc: 'Acute phase stabilized; ongoing chronic or long-term management required.',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
  },
  {
    value: 'UNCHANGED',
    label: 'Unchanged Baseline',
    desc: 'Patient remains at baseline chronic state with no clinical progression.',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
  },
  {
    value: 'TRANSFERRED_SUPER_SPECIALTY',
    label: 'Transferred to Higher Care',
    desc: 'Patient transferred onward to national institute or super-specialty hospital.',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
  },
  {
    value: 'SELF_DISCHARGED',
    label: 'Discharged Against Advice (AMA)',
    desc: 'Patient or family requested early departure against medical recommendations.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
  },
  {
    value: 'DECEASED',
    label: 'Deceased During Stay',
    desc: 'Patient expired during inpatient hospital hospitalization.',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
  }
];

export function PatientOutcomeModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [outcomeCategory, setOutcomeCategory] = useState('CLINICALLY_IMPROVED');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [functionalStatus, setFunctionalStatus] = useState('AMBULATORY');
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
      setErrorMessage('Please confirm authorization of this clinical outcome evaluation.');
      return;
    }

    if (!outcomeNotes.trim() || outcomeNotes.trim().length < 10) {
      setErrorMessage('Please provide substantive clinical outcome notes (minimum 10 characters).');
      return;
    }

    if (!clinicianSignature.trim()) {
      setErrorMessage('Attending clinician name and signature are required.');
      return;
    }

    // Tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You are not authorized to record outcomes for another hospital.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        outcome_category: outcomeCategory,
        outcome: outcomeCategory,
        outcome_notes: outcomeNotes.trim(),
        functional_status: functionalStatus,
        clinician_signature: clinicianSignature.trim(),
        documented_at: new Date().toISOString()
      };

      const result = await hospitalService.recordPatientOutcome(referral.id, payload);
      if (onSuccess) {
        onSuccess(result, payload);
      }
      onClose();
    } catch (err) {
      console.error('[PatientOutcomeModal] Error:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to record patient outcome.');
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
      aria-labelledby="outcome-modal-title"
      data-testid="patient-outcome-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 id="outcome-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Document Standardized Patient Outcome
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

          {/* Clinical Principle Callout */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200">
            <strong>Clinical Integrity Standard:</strong> Never infer clinical recovery simply because a patient was discharged. Clinical outcome must be explicitly determined and recorded by the attending clinical specialist.
          </div>

          {/* Outcome Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Standardized Clinical Outcome Category *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {OUTCOME_CATEGORIES.map((opt) => {
                const selected = outcomeCategory === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setOutcomeCategory(opt.value)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selected
                        ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {selected && <CheckCircle className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Outcome Details */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Clinical Outcome Evaluation Notes *
            </label>
            <textarea
              rows={3}
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Detail patient clinical status, symptom resolution, residual deficits or ongoing management needs..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              required
            />
            <span className="text-[11px] text-slate-400">
              Minimum 10 characters documenting clinical outcome.
            </span>
          </div>

          {/* Functional Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Functional Mobility Status at Outcome Evaluation</span>
            </label>
            <select
              value={functionalStatus}
              onChange={(e) => setFunctionalStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="AMBULATORY">Fully Ambulatory / Independent</option>
              <option value="ASSISTED_AMBULATION">Ambulatory with Assistance or Assistive Device</option>
              <option value="WHEELCHAIR">Wheelchair Dependent</option>
              <option value="BED_BOUND">Bed-Bound / Dependent on Nursing</option>
              <option value="DECEASED">Non-Viable / Deceased</option>
            </select>
          </div>

          {/* Clinician Signature */}
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
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
                className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  I certify this clinical outcome evaluation.
                </strong>{' '}
                I confirm that this standardized patient outcome represents an authorized clinical assessment.
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
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {submitting ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording Outcome...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Save Outcome Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PatientOutcomeModal;
