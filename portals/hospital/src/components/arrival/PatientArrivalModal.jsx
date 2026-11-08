import React, { useState } from 'react';
import {
  Truck,
  X,
  Clock,
  Building,
  User,
  FileText,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

const TRIAGE_BAYS = [
  'Emergency Triage Bay 1 (Resuscitation)',
  'Emergency Triage Bay 2 (Acute Adult)',
  'Pediatric Emergency Intake',
  'Maternity & Labor Triage Reception',
  'General Inpatient Admission Desk',
  'Specialist Outpatient / Direct Transfer'
];

export default function PatientArrivalModal({
  isOpen,
  onClose,
  referral,
  onSuccess,
  isVerified = false
}) {
  if (!isOpen || !referral) return null;

  const { user } = useAuth();
  const staffName = user?.name || user?.full_name || 'Hospital Triage Officer';

  // Format local current datetime for the arrival time input (YYYY-MM-DDTHH:mm)
  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [actualArrivalTime, setActualArrivalTime] = useState(localDatetime);
  const [receivingDepartment, setReceivingDepartment] = useState(
    referral.allocated_ward_department || 'Emergency Triage Bay 1 (Resuscitation)'
  );
  const [receivingStaffName, setReceivingStaffName] = useState(staffName);
  const [arrivalNotes, setArrivalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        actual_arrival_time: new Date(actualArrivalTime).toISOString(),
        receiving_department: receivingDepartment,
        receiving_staff_name: receivingStaffName.trim() || staffName,
        arrival_notes: arrivalNotes.trim() || 'Physical patient arrival confirmed at hospital triage',
        verification_confirmed: isVerified
      };

      const result = await hospitalService.confirmPatientArrival(referral.id, payload);
      if (onSuccess) {
        onSuccess(result, 'Patient physical arrival registered successfully! Status updated to PATIENT_ARRIVED.');
      }
      onClose();
    } catch (err) {
      console.error('[PatientArrivalModal] Submission error:', err);
      setError(err?.message || 'Failed to record patient arrival. Please verify connectivity and try again.');
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
      aria-labelledby="arrival-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-900/60 overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-blue-100 dark:border-blue-950/60 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="arrival-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Record Physical Patient Arrival
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Register presentation of <strong>{patientName}</strong> ({refCode})
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

          {/* Actual Arrival Timestamp */}
          <div className="space-y-1.5">
            <label htmlFor="actual-arrival-time" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Actual Physical Arrival Date & Time *</span>
            </label>
            <input
              id="actual-arrival-time"
              type="datetime-local"
              value={actualArrivalTime}
              onChange={(e) => setActualArrivalTime(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Captures actual physical arrival time at the hospital gate/bay (distinguished from electronic log timestamp).
            </p>
          </div>

          {/* Receiving Department / Triage Intake Bay */}
          <div className="space-y-1.5">
            <label htmlFor="receiving-department-select" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Receiving Bay / Triage Department *</span>
            </label>
            <select
              id="receiving-department-select"
              value={receivingDepartment}
              onChange={(e) => setReceivingDepartment(e.target.value)}
              required
              disabled={submitting}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {TRIAGE_BAYS.map((bay) => (
                <option key={bay} value={bay}>{bay}</option>
              ))}
            </select>
          </div>

          {/* Receiving Staff Member Attribution */}
          <div className="space-y-1.5">
            <label htmlFor="receiving-staff-input" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Receiving Staff Member Name *</span>
            </label>
            <input
              id="receiving-staff-input"
              type="text"
              value={receivingStaffName}
              onChange={(e) => setReceivingStaffName(e.target.value)}
              required
              disabled={submitting}
              placeholder="e.g. Nurse Triage Specialist Tigist"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Arrival Condition & Triage Notes */}
          <div className="space-y-1.5">
            <label htmlFor="arrival-notes-input" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Arrival Clinical Condition & Initial Assessment Notes</span>
            </label>
            <textarea
              id="arrival-notes-input"
              value={arrivalNotes}
              onChange={(e) => setArrivalNotes(e.target.value)}
              rows={3}
              placeholder="Record immediate presentation status (e.g. Patient conscious, accompanied by health extension worker; IV fluid infusing; oxygen at 2L/min)..."
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Verification Status Notice */}
          <div className={`p-3 rounded-xl border flex items-center gap-2 text-[11px] ${
            isVerified
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              {isVerified
                ? 'Identity verification completed: Patient credentials confirmed against referral dossier.'
                : 'Note: Identity checklist incomplete. Please ensure physical ID is verified during handover.'}
            </span>
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Registering Arrival...</span>
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4" />
                  <span>Confirm Physical Arrival</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
