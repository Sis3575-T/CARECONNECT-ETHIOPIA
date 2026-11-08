import React, { useState } from 'react';
import {
  XCircle,
  X,
  AlertTriangle,
  Building,
  FileText,
  AlertCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { hospitalService } from '../../services/hospitalService.js';

const REJECTION_REASON_CODES = [
  { code: 'CAPACITY_FULL', label: 'Inpatient Capacity Full', desc: 'No inpatient beds currently vacant in relevant ward' },
  { code: 'SPECIALIST_UNAVAILABLE', label: 'Specialist Physician Unavailable', desc: 'Subspecialist or surgical team on call unavailable' },
  { code: 'NO_BEDS_AVAILABLE', label: 'Critical Care / Monitored Beds Full', desc: 'ICU / NICU / HDU at 100% capacity' },
  { code: 'INAPPROPRIATE_CLINICAL_TIER', label: 'Inappropriate Clinical Tier', desc: 'Condition can be safely treated at health centre tier' },
  { code: 'EQUIPMENT_MAINTENANCE', label: 'Essential Equipment Inoperative', desc: 'Dialysis, CT scanner, OR suite, or oxygen supply interrupted' },
  { code: 'CAPACITY_EXCEEDED', label: 'Facility Level Exceeded', desc: 'Patient requires specialized tertiary care beyond facility capabilities' },
  { code: 'OTHER', label: 'Other Administrative / Clinical Reason', desc: 'Detailed explanation documented below' }
];

export default function ReferralRejectModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  if (!isOpen || !referral) return null;

  const [reasonCode, setReasonCode] = useState('CAPACITY_FULL');
  const [reasonText, setReasonText] = useState('');
  const [alternativeFacility, setAlternativeFacility] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reasonText.trim();
    if (!trimmed || trimmed.length < 5) {
      setError('A detailed clinical or administrative rejection reason is required (minimum 5 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        rejection_reason_code: reasonCode,
        reason: trimmed,
        recommended_alternative_facility_id: alternativeFacility.trim() || undefined
      };

      const result = await hospitalService.rejectReferral(referral.id, payload);
      if (onSuccess) {
        onSuccess(result, 'Referral rejected. Notification and alternative recommendations transmitted to health centre.');
      }
      onClose();
    } catch (err) {
      console.error('[HospitalRejectModal] Submission error:', err);
      setError(err?.message || 'Failed to reject referral. Please check connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = referral.patient_name || referral.patientName || 'Unnamed Patient';
  const refCode = referral.reference_number || referral.id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/60 overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-rose-100 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="reject-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Reject Inpatient Referral
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Record refusal for <strong>{patientName}</strong> ({refCode})
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Healthcare Coordination Impact Notice</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                Rejecting a referral halts immediate transfer to your facility. A clear clinical rationale and alternative routing advice are required to ensure continuous patient safety.
              </p>
            </div>
          </div>

          {/* Standardized Rejection Reason Category */}
          <div className="space-y-1.5">
            <label htmlFor="rejection-code-select" className="font-bold text-slate-800 dark:text-slate-200">
              Standardized Refusal Category *
            </label>
            <select
              id="rejection-code-select"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            >
              {REJECTION_REASON_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} — {c.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Clinical Justification */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="rejection-reason-text" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Mandatory Clinical & Operational Explanation *</span>
              </label>
              <span className={`text-[10px] ${reasonText.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {reasonText.trim().length} / 5 min characters
              </span>
            </div>
            <textarea
              id="rejection-reason-text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              placeholder="Detail reasons why your hospital cannot accept this case (e.g. All 12 ICU beds occupied; on-call neurosurgeon unavailable until tomorrow 08:00)..."
              required
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Recommended Alternative Facility */}
          <div className="space-y-1.5">
            <label htmlFor="alternative-facility-input" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Recommended Alternative Facility (Optional)</span>
            </label>
            <input
              id="alternative-facility-input"
              type="text"
              value={alternativeFacility}
              onChange={(e) => setAlternativeFacility(e.target.value)}
              placeholder="e.g. Tikur Anbessa Specialized Hospital / St. Paul's Hospital MMC"
              disabled={submitting}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={submitting || reasonText.trim().length < 5}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Rejecting Referral...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
