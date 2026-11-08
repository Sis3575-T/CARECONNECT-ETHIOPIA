import React, { useState } from 'react';
import {
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Phone,
  Building,
  User
} from 'lucide-react';

export default function PatientIdentityVerification({
  referral,
  onVerificationChange,
  isVerified = false,
  mismatchReported = false
}) {
  if (!referral) return null;

  const [checklist, setChecklist] = useState({
    slipMatched: false,
    patientConfirmed: false,
    idCardInspected: false,
    clinicalRecordsMatched: false
  });

  const [hasMismatch, setHasMismatch] = useState(mismatchReported);
  const [mismatchNotes, setMismatchNotes] = useState('');

  const patientName = referral.patient_name || referral.patientName || 'Unnamed Patient';
  const faydaId = referral.patient_fayda_id
    ? `••••-••••-${referral.patient_fayda_id.slice(-4)}`
    : 'Not registered on file';

  const toggleItem = (key) => {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);

    const allChecked = Object.values(updated).every(Boolean);
    if (onVerificationChange) {
      onVerificationChange({
        isVerified: allChecked && !hasMismatch,
        hasMismatch,
        mismatchNotes,
        checklist: updated
      });
    }
  };

  const handleMismatchToggle = (checked) => {
    setHasMismatch(checked);
    if (onVerificationChange) {
      onVerificationChange({
        isVerified: checked ? false : Object.values(checklist).every(Boolean),
        hasMismatch: checked,
        mismatchNotes,
        checklist
      });
    }
  };

  const handleMismatchNotesChange = (text) => {
    setMismatchNotes(text);
    if (onVerificationChange) {
      onVerificationChange({
        isVerified: false,
        hasMismatch: true,
        mismatchNotes: text,
        checklist
      });
    }
  };

  const allCriteriaMet = Object.values(checklist).every(Boolean) && !hasMismatch;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Patient Identity Verification Protocol
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Strict multi-factor verification required prior to physical receiving confirmation
            </p>
          </div>
        </div>

        {/* Verification Status Pill */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
          hasMismatch
            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            : allCriteriaMet
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        }`}>
          {hasMismatch ? (
            <>
              <XCircle className="w-3.5 h-3.5" />
              <span>Identity Mismatch Flagged</span>
            </>
          ) : allCriteriaMet ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Identity Verified</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Verification Pending</span>
            </>
          )}
        </span>
      </div>

      {/* Critical Mismatch Alert Banner */}
      {hasMismatch && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border-l-4 border-rose-600 p-4 rounded-xl flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-rose-900 dark:text-rose-200 text-xs">
              CRITICAL PATIENT IDENTIFIER MISMATCH REPORTED
            </h4>
            <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
              Arriving patient credentials or physical documents do not correspond to the digital referral dossier. Physical handover and operational admission are automatically locked until an authorized triage officer and referring clinician resolve the discrepancy.
            </p>
          </div>
        </div>
      )}

      {/* Dossier Comparison Card */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Expected Patient Information (From Verified Referral Dossier)
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Full Legal Name</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{patientName}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Age & Biological Sex</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
              {referral.patient_age ? `${referral.patient_age} years` : 'Age N/A'}, {referral.patient_gender || 'Not specified'}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Fayda National ID</span>
            <p className="font-mono font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{faydaId}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Catchment Residence</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
              {referral.patient_woreda || 'Woreda N/A'}{referral.patient_kebele ? `, Kebele ${referral.patient_kebele}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Protocol Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Physical Arrival Verification Criteria</span>
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            {Object.values(checklist).filter(Boolean).length} / 4 verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
            checklist.slipMatched
              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30'
          }`}>
            <input
              type="checkbox"
              checked={checklist.slipMatched}
              onChange={() => toggleItem('slipMatched')}
              disabled={hasMismatch}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Physical Referral Slip Matched</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Paper referral slip reference number matches <strong>{referral.reference_number || referral.id}</strong>
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
            checklist.patientConfirmed
              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30'
          }`}>
            <input
              type="checkbox"
              checked={checklist.patientConfirmed}
              onChange={() => toggleItem('patientConfirmed')}
              disabled={hasMismatch}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Patient / Guardian Confirmed</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Patient or accompanying relative actively confirms full name and birth year
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
            checklist.idCardInspected
              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30'
          }`}>
            <input
              type="checkbox"
              checked={checklist.idCardInspected}
              onChange={() => toggleItem('idCardInspected')}
              disabled={hasMismatch}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Identification Card Inspected</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Fayda digital card, Kebele resident card, or birth certificate inspected
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
            checklist.clinicalRecordsMatched
              ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30'
          }`}>
            <input
              type="checkbox"
              checked={checklist.clinicalRecordsMatched}
              onChange={() => toggleItem('clinicalRecordsMatched')}
              disabled={hasMismatch}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Clinical Records Corresponded</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Presenting medical complaint matches diagnosis <strong>{referral.primary_diagnosis}</strong>
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Discrepancy Reporting Toggle */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasMismatch}
            onChange={(e) => handleMismatchToggle(e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
          />
          <span className="font-bold text-rose-700 dark:text-rose-400 text-xs">
            Report an Identity Discrepancy or Mismatch for this Patient
          </span>
        </label>

        {hasMismatch && (
          <div className="space-y-1.5 pt-1">
            <textarea
              value={mismatchNotes}
              onChange={(e) => handleMismatchNotesChange(e.target.value)}
              rows={2}
              placeholder="Describe the discrepancy (e.g. Patient ID card shows different name or age from referral; photo ID does not correspond)..."
              className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Preserves security exception record in referral audit trail. Matching names alone do not constitute proof of identity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
