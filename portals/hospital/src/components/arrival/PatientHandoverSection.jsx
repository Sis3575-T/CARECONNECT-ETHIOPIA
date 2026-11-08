import React, { useState } from 'react';
import {
  ClipboardCheck,
  Building,
  User,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Package,
  Plus
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export default function PatientHandoverSection({
  referral,
  onHandoverRecorded,
  isLocked = false
}) {
  const { user } = useAuth();
  const staffName = user?.name || user?.full_name || 'Hospital Triage Nurse';
  const staffRole = user?.role_name || user?.role || 'Receiving Staff';

  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Handover form state
  const [giverName, setGiverName] = useState(
    referral.referring_clinician_name || referral.referring_user_name || ''
  );
  const [giverRole, setGiverRole] = useState('Referring Facility Escort / Ambulance Team');
  const [receiverName, setReceiverName] = useState(staffName);

  const [checklist, setChecklist] = useState({
    patientPhysicallyReceived: true,
    paperReferralSlipReceived: true,
    diagnosticsReceived: false,
    medicationSheetReceived: false,
    belongingsAccountedFor: true
  });

  const [conditionSummary, setConditionSummary] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [hasExceptions, setHasExceptions] = useState(false);
  const [exceptionNotes, setExceptionNotes] = useState('');

  const toggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        handover_giver_name: giverName.trim() || 'Health Centre Escort Worker',
        handover_giver_role: giverRole.trim(),
        receiving_staff_name: receiverName.trim() || staffName,
        handover_time: new Date().toISOString(),
        documents_received: Object.entries(checklist)
          .filter(([_, v]) => v)
          .map(([k]) => k),
        belongings_received: checklist.belongingsAccountedFor,
        physical_condition_summary: conditionSummary.trim() || 'Stable upon handover',
        handover_notes: handoverNotes.trim() + (hasExceptions ? ` [EXCEPTION: ${exceptionNotes.trim()}]` : '')
      };

      await hospitalService.recordPatientHandover(referral.id, payload);
      setSuccess('Patient clinical handover documentation recorded successfully in referral audit log.');
      setIsEditing(false);
      if (onHandoverRecorded) {
        onHandoverRecorded(payload);
      }
    } catch (err) {
      console.error('[PatientHandoverSection] Save error:', err);
      setError(err?.message || 'Failed to record handover documentation.');
    } finally {
      setSubmitting(false);
    }
  };

  const originFacility = referral.origin_facility_name || referral.referringFacility || 'Referring Health Centre';
  const hasArrived = ['PATIENT_ARRIVED', 'ARRIVED', 'IN_PROGRESS'].includes((referral.status || '').toUpperCase());

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Patient Handover & Receiving Documentation
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Structured inter-facility transfer documentation between escort team and hospital receiving triage
            </p>
          </div>
        </div>

        {hasArrived && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            disabled={isLocked}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Document Clinical Handover</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* When Not Arrived Notice */}
      {!hasArrived && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 text-center space-y-1">
          <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            Awaiting Physical Patient Arrival
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Handover documentation becomes active once the patient's physical arrival at the hospital triage bay has been recorded.
          </p>
        </div>
      )}

      {/* Handover Form when editing */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Giver Info */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Handover Giver (Escort / Referring Facility) *</span>
              </label>
              <input
                type="text"
                value={giverName}
                onChange={(e) => setGiverName(e.target.value)}
                required
                placeholder="Escort clinician or ambulance nurse name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Facility: <strong>{originFacility}</strong>
              </p>
            </div>

            {/* Receiver Info */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Handover Receiver (Hospital Receiving Staff) *</span>
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                required
                placeholder="Hospital triage nurse or receiving officer"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Role: <strong>{staffRole}</strong>
              </p>
            </div>
          </div>

          {/* Transfer Verification Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Physical Receiving & Materials Checklist
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.patientPhysicallyReceived}
                  onChange={() => toggleChecklist('patientPhysicallyReceived')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 dark:text-slate-200">Patient physically received at triage bay</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.paperReferralSlipReceived}
                  onChange={() => toggleChecklist('paperReferralSlipReceived')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 dark:text-slate-200">Original paper referral slip received</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.diagnosticsReceived}
                  onChange={() => toggleChecklist('diagnosticsReceived')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 dark:text-slate-200">Diagnostic lab sheets / X-rays received</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.medicationSheetReceived}
                  onChange={() => toggleChecklist('medicationSheetReceived')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 dark:text-slate-200">Pre-transfer medication record received</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 cursor-pointer sm:col-span-2">
                <input
                  type="checkbox"
                  checked={checklist.belongingsAccountedFor}
                  onChange={() => toggleChecklist('belongingsAccountedFor')}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-slate-800 dark:text-slate-200">Patient personal belongings & documents accounted for</span>
              </label>
            </div>
          </div>

          {/* Condition & Observations */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Condition & Vitals at Handover
            </label>
            <textarea
              value={conditionSummary}
              onChange={(e) => setConditionSummary(e.target.value)}
              rows={2}
              placeholder="State patient physiological status during handover (e.g. Awake, oriented; peripheral pulse 84 bpm; BP 118/76; oxygen therapy ongoing)..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Handover Notes & Exceptions */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Operational Handover Notes
            </label>
            <textarea
              value={handoverNotes}
              onChange={(e) => setHandoverNotes(e.target.value)}
              rows={2}
              placeholder="Record any special remarks, escort notes, or pending clinical coordination items..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Handover Exception Toggle */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExceptions}
                onChange={(e) => setHasExceptions(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
              />
              <span className="font-bold text-amber-700 dark:text-amber-400 text-xs">
                Log Handover Exception or Missing Items
              </span>
            </label>

            {hasExceptions && (
              <textarea
                value={exceptionNotes}
                onChange={(e) => setExceptionNotes(e.target.value)}
                rows={2}
                placeholder="Specify exception (e.g. Missing official transfer letter stamp; IV cannula was dislodged during ambulance transit)..."
                className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
              />
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording Handover...</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Save Handover Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Summary View when not editing */}
      {hasArrived && !isEditing && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Transferring Facility</span>
            <p className="font-bold text-slate-900 dark:text-white">{originFacility}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Escort Staff: {referral.referring_clinician_name || 'Health Centre Escort'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Hospital Receiving Lead</span>
            <p className="font-bold text-slate-900 dark:text-white">{staffName}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{staffRole}</p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Handover Protocol Status</span>
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Ready for Operational Admission</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Physical presence confirmed at triage</p>
          </div>
        </div>
      )}
    </div>
  );
}
