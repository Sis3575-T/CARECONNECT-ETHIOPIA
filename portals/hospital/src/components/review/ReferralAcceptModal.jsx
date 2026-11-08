import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  Building,
  Bed,
  FileText,
  AlertCircle,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { hospitalService } from '../../services/hospitalService.js';

const WARD_OPTIONS = [
  'General Inpatient Medical Ward',
  'Emergency & Acute Observation',
  'Intensive Care Unit (ICU)',
  'Neonatal ICU (NICU)',
  'Pediatrics Ward',
  'Maternity & Labor Ward',
  'General Surgical Ward',
  'Orthopedic Ward',
  'Infectious Disease & Isolation Ward'
];

const BED_TYPES = [
  { id: 'STANDARD', label: 'Standard Inpatient Bed', desc: 'General acute inpatient care' },
  { id: 'EMERGENCY_OBSERVATION', label: 'Emergency Observation Bed', desc: 'Immediate ED resuscitation and monitoring' },
  { id: 'ICU', label: 'ICU / Critical Care Bed', desc: 'Mechanical ventilation and continuous hemodynamic monitoring' },
  { id: 'ISOLATION', label: 'Isolation Bed', desc: 'Negative pressure / airborne / contact isolation' }
];

export default function ReferralAcceptModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  if (!isOpen || !referral) return null;

  const [ward, setWard] = useState(referral.service_category || 'General Inpatient Medical Ward');
  const [bedType, setBedType] = useState('STANDARD');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        allocated_ward_department: ward,
        assigned_bed_type: bedType,
        decision_notes: decisionNotes.trim() || 'Referral accepted. Inpatient specialty slot allocated.'
      };

      const result = await hospitalService.acceptReferral(referral.id, payload);
      if (onSuccess) {
        onSuccess(result, 'Referral formally accepted! Ward and bed type allocated.');
      }
      onClose();
    } catch (err) {
      console.error('[HospitalAcceptModal] Submission error:', err);
      setError(err?.message || 'Failed to accept referral. Please verify hospital capacity and try again.');
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
      aria-labelledby="accept-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/80 bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="accept-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Accept Patient Referral
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Confirm capacity and allocate receiving bed for <strong>{patientName}</strong> ({refCode})
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

          {/* Ward / Department Selection */}
          <div className="space-y-1.5">
            <label htmlFor="accept-ward" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Allocated Clinical Ward / Department *</span>
            </label>
            <select
              id="accept-ward"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {WARD_OPTIONS.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          {/* Assigned Bed Type */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Bed Classification *</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BED_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`flex flex-col p-2.5 rounded-xl border cursor-pointer transition-all ${
                    bedType === type.id
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{type.label}</span>
                    <input
                      type="radio"
                      name="bedType"
                      value={type.id}
                      checked={bedType === type.id}
                      onChange={() => setBedType(type.id)}
                      disabled={submitting}
                      className="text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{type.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Decision Notes & Admitting Directions */}
          <div className="space-y-1.5">
            <label htmlFor="accept-notes" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Admitting Instructions & Clinical Acceptance Notes</span>
            </label>
            <textarea
              id="accept-notes"
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={3}
              placeholder="Provide special instructions for transport team or intake nurses (e.g. Bring patient via Emergency Bay 2; prepare cardiac monitor)..."
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Accepting this referral commits your hospital capacity and notifies the referring health centre immediately.</span>
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
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Accepting Case...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Acceptance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
