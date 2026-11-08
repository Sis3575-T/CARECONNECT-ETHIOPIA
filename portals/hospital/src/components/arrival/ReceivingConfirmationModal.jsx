import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  Building,
  User,
  Bed,
  Clock,
  FileCheck,
  AlertCircle,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';
import { formatClinicalDate } from '@shared/utils/formatters.js';

export default function ReceivingConfirmationModal({
  isOpen,
  onClose,
  referral,
  onSuccess,
  isVerified = false
}) {
  if (!isOpen || !referral) return null;

  const { user } = useAuth();
  const staffName = user?.name || user?.full_name || 'Hospital Inpatient Receiving Lead';

  const [ward, setWard] = useState(
    referral.allocated_ward_department || 'General Inpatient Medical Ward'
  );
  const [bedType, setBedType] = useState(referral.assigned_bed_type || 'STANDARD');
  const [confirmingStaff, setConfirmingStaff] = useState(staffName);
  const [progressNotes, setProgressNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        admitted_ward: ward,
        admitted_bed: bedType,
        receiving_staff_name: confirmingStaff.trim() || staffName,
        progress_notes: progressNotes.trim() || `Patient received at ${ward} (Bed: ${bedType}). Physical handover verified and operational admission logged.`
      };

      const result = await hospitalService.confirmReceivingAdmission(referral.id, payload);
      if (onSuccess) {
        onSuccess(result, 'Patient successfully received and admitted into ward care! Referral status updated to IN_PROGRESS.');
      }
      onClose();
    } catch (err) {
      console.error('[ReceivingConfirmationModal] Submission error:', err);
      setError(err?.message || 'Failed to confirm receiving admission. Please verify facility permissions and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = referral.patient_name || referral.patientName || 'Unnamed Patient';
  const refCode = referral.reference_number || referral.id;
  const originFacility = referral.origin_facility_name || 'Referring Health Centre';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receiving-confirm-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-900/60 overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="receiving-confirm-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Confirm Patient Receipt & Operational Admission
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Official hospital reception for <strong>{patientName}</strong> ({refCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pre-Confirmation Review Summary */}
          <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5 text-xs">
            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Verification & Transfer Summary
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Patient & Case Reference</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">{patientName}</p>
                <p className="text-[10px] font-mono text-slate-500">{refCode}</p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Originating Facility</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">{originFacility}</p>
                <p className="text-[10px] text-slate-500">Service: {referral.service_category || 'Inpatient'}</p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Physical Arrival</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {referral.arrived_at ? formatClinicalDate(referral.arrived_at) : 'Arrival Confirmed'}
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ At Hospital Triage</p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Identity Verification</span>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {isVerified ? 'Fully Verified' : 'Checklist In Progress'}
                </p>
                <p className="text-[10px] text-slate-500">Fayda / Kebele credentials inspected</p>
              </div>
            </div>
          </div>

          {/* Receiving Ward Department */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-ward-input" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Receiving Inpatient Ward *</span>
            </label>
            <input
              id="confirm-ward-input"
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Bed Allocation */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-bed-select" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              <span>Allocated Bed Type *</span>
            </label>
            <select
              id="confirm-bed-select"
              value={bedType}
              onChange={(e) => setBedType(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="STANDARD">STANDARD — General Inpatient Bed</option>
              <option value="EMERGENCY_OBSERVATION">EMERGENCY_OBSERVATION — Acute Monitored Bed</option>
              <option value="ICU">ICU — Intensive Care Bed</option>
              <option value="ISOLATION">ISOLATION — Negative Pressure / Isolation Bed</option>
            </select>
          </div>

          {/* Confirming Staff Member */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-staff-input" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Confirming Hospital Staff Member *</span>
            </label>
            <input
              id="confirm-staff-input"
              type="text"
              value={confirmingStaff}
              onChange={(e) => setConfirmingStaff(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Operational Progress / Receiving Notes */}
          <div className="space-y-1.5">
            <label htmlFor="confirm-progress-notes" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Receiving Admission & Progress Notes</span>
            </label>
            <textarea
              id="confirm-progress-notes"
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              rows={3}
              placeholder="Record operational admission note (e.g. Patient transferred to Ward 3, Bed 14; vitals monitored; admitting resident notified)..."
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Explicit human confirmation required. This action formally updates referral status to IN_PROGRESS and notifies referring facility that the transfer is complete.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Confirming Receipt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Receipt & Inpatient Admission</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
