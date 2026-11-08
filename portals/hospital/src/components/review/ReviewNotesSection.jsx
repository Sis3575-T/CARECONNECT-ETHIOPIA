import React, { useState } from 'react';
import {
  FileText,
  UserCheck,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export default function ReviewNotesSection({
  referral,
  onSaveNotes,
  isSaving = false
}) {
  const { user } = useAuth();
  const [internalNotes, setInternalNotes] = useState('');
  const [clinicalAssessment, setClinicalAssessment] = useState('');
  const [activeTab, setActiveTab] = useState('INTERNAL'); // 'INTERNAL' | 'PREVIOUS'
  const [checklist, setChecklist] = useState({
    acuityVerified: false,
    specialtyMatches: true,
    vitalsStabilized: false,
    diagnosticsSufficient: false
  });

  const clinicianName = user?.name || user?.full_name || 'Hospital Triage Officer';
  const clinicianRole = user?.role_name || user?.role || 'Senior Medical Officer';
  const clinicianDept = user?.department || referral?.service_category || 'Inpatient Clinical Services';

  const toggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-5 text-xs">
      {/* Header with Clinician Attribution */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Clinical Triage Review & Internal Evaluation Notes
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Confidential internal evaluation for receiving clinical department
            </p>
          </div>
        </div>

        {/* Reviewing Clinician Badge */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px]">
          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{clinicianName}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{clinicianRole} &bull; {clinicianDept}</p>
          </div>
        </div>
      </div>

      {/* Clinical Review Evaluation Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Triage Verification Protocol</span>
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            allChecked
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}>
            {Object.values(checklist).filter(Boolean).length} / {Object.keys(checklist).length} Criteria Met
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={checklist.acuityVerified}
              onChange={() => toggleChecklist('acuityVerified')}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Acuity & Severity Verified</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Baseline vitals and emergency indicators reviewed against triage criteria</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={checklist.specialtyMatches}
              onChange={() => toggleChecklist('specialtyMatches')}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Specialty Tier Alignment</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Diagnosis corresponds to active specialty and clinical capabilities</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={checklist.vitalsStabilized}
              onChange={() => toggleChecklist('vitalsStabilized')}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Transfer Readiness Confirmed</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Pre-transfer stabilization was initiated or deemed appropriate</p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={checklist.diagnosticsSufficient}
              onChange={() => toggleChecklist('diagnosticsSufficient')}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Diagnostic Slips Evaluated</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Attached lab/imaging reports are clinically adequate for triage</p>
            </div>
          </label>
        </div>
      </div>

      {/* Internal Clinical Evaluation Notes Area */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <label htmlFor="internal-review-notes" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>Internal Specialist Notes & Assessment (Hospital Confidential)</span>
          </label>
          <span className="text-[10px] text-slate-400">
            Visible only to hospital staff &bull; Not shared externally
          </span>
        </div>

        <textarea
          id="internal-review-notes"
          value={internalNotes}
          onChange={(e) => setInternalNotes(e.target.value)}
          rows={3}
          placeholder="Record specialist observations, bed allocation preferences, or preliminary medical directions..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all resize-y"
        />

        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
          <span>Review Status: <strong className="text-slate-800 dark:text-slate-200">{referral?.status || 'UNDER_REVIEW'}</strong></span>
          {onSaveNotes && internalNotes.trim().length > 0 && (
            <button
              onClick={() => onSaveNotes(internalNotes)}
              disabled={isSaving}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold transition-all shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Draft Note'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
