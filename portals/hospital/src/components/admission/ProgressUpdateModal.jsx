import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Layers,
  PlusCircle,
  User,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

const PROGRESS_EVENT_OPTIONS = [
  { value: 'SERVICE_COMMENCED', label: 'Service / Procedure Commenced', desc: 'Specialist evaluation or tertiary intervention initiated' },
  { value: 'TREATMENT_MILESTONE', label: 'Clinical Milestone Achieved', desc: 'Patient clinical stability or operational checkpoint reached' },
  { value: 'INTER_DEPARTMENTAL_CONSULT', label: 'Cross-Department Consult', desc: 'Consultation requested with another hospital specialty' },
  { value: 'OPERATIONAL_DELAY', label: 'Operational / Diagnostic Delay', desc: 'Delay in imaging, lab results, or theater availability noted' },
  { value: 'COORDINATION_NOTE', label: 'Liaison & Coordination Note', desc: 'Communication with referring health centre or patient family' },
  { value: 'DISCHARGE_PLANNING', label: 'Discharge Planning Initiated', desc: 'Patient stabilizing; counter-referral preparations underway' }
];

export function ProgressUpdateModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [eventType, setEventType] = useState('SERVICE_COMMENCED');
  const [progressNotes, setProgressNotes] = useState('');
  const [updatedBedType, setUpdatedBedType] = useState(referral?.assigned_bed_type || 'STANDARD');
  const [staffName, setStaffName] = useState(
    user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Hospital Specialist')
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen || !referral) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!progressNotes.trim() || progressNotes.trim().length < 5) {
      setErrorMessage('Please provide detailed operational progress notes (minimum 5 characters).');
      return;
    }

    // Tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You cannot record progress for referrals of other hospitals.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedOption = PROGRESS_EVENT_OPTIONS.find(o => o.value === eventType);
      const categoryLabel = selectedOption ? selectedOption.label : eventType;

      const formattedNote = `[${categoryLabel}] ${progressNotes.trim()} (Logged by ${staffName})`;

      const payload = {
        notes: formattedNote,
        progress_notes: formattedNote,
        event_type: eventType,
        allocated_ward_department: referral.allocated_ward_department,
        assigned_bed_type: updatedBedType
      };

      const updated = await hospitalService.recordCareProgress(referral.id, payload);

      if (onSuccess) {
        onSuccess(updated, 'Care progress update recorded successfully.');
      }
      onClose();
    } catch (err) {
      console.error('[ProgressUpdateModal] Failed to record progress:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to record care progress.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-modal-title"
      data-testid="progress-update-modal"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 id="progress-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Clinical Care Progress Update
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Event Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Care Progress Milestone / Event Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PROGRESS_EVENT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-2xs text-slate-400 mt-1 block">
              {PROGRESS_EVENT_OPTIONS.find(o => o.value === eventType)?.desc}
            </span>
          </div>

          {/* Progress Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Operational Progress Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              rows={4}
              placeholder="Record operational observations, procedures performed, specialist consult findings, or delay causes..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <span className="text-2xs text-slate-400 mt-1 block">
              Note: Do not record speculative clinical prescriptions. Keep operational notes auditable and concise.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Responsible Clinician Attribution */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reporting Clinician / Staff Attribution
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Bed Type Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Bed Classification
              </label>
              <select
                value={updatedBedType}
                onChange={(e) => setUpdatedBedType(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="STANDARD">Standard Ward Bed</option>
                <option value="EMERGENCY_OBSERVATION">Emergency Observation Unit</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="ISOLATION">Isolation Ward</option>
              </select>
            </div>
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
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save Progress Update</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProgressUpdateModal;
