import React, { useState } from 'react';
import {
  Bed,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Layers,
  User,
  Shield,
  AlertCircle,
  FileText,
  Activity,
  ArrowRight
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import { AdmissionStatusBadge } from './AdmissionStatusBadge.jsx';

/**
 * CareConnect Ethiopia - Admission Record & Operational Status Card
 * Explicitly distinguishes:
 * 1. Referral Accepted
 * 2. Patient Arrived at Triage
 * 3. Formal Inpatient Ward Admission
 * 4. Ongoing Care Progress
 * 5. Referral Completion
 */
export function AdmissionRecordCard({
  referral,
  onAdmitPatient,
  onReassignDepartment,
  disabled = false
}) {
  const [admitting, setAdmitting] = useState(false);
  const [admissionWard, setAdmissionWard] = useState(referral?.allocated_ward_department || '');
  const [admissionBed, setAdmissionBed] = useState(referral?.assigned_bed_type || 'STANDARD');
  const [admissionNote, setAdmissionNote] = useState('');
  const [showAdmitForm, setShowAdmitForm] = useState(false);
  const [error, setError] = useState(null);

  if (!referral) return null;

  const statusKey = String(referral.status || '').toUpperCase();
  const isAccepted = Boolean(referral.decision_at || referral.acknowledged_at || statusKey === 'ACCEPTED');
  const isArrived = statusKey === 'PATIENT_ARRIVED' || statusKey === 'ARRIVED';
  const isInProgress = statusKey === 'IN_PROGRESS';
  const isCompleted = statusKey === 'COMPLETED';
  const isClosed = statusKey === 'CLOSED';

  // Determine current lifecycle step index (0 to 4)
  let activeStep = 0;
  if (isClosed) activeStep = 4;
  else if (isCompleted) activeStep = 3;
  else if (isInProgress) activeStep = 2;
  else if (isArrived) activeStep = 1;
  else if (isAccepted) activeStep = 0;

  const steps = [
    {
      title: '1. Referral Accepted',
      subtitle: 'Bed & Specialty Reserved',
      timestamp: referral.decision_at || referral.acknowledged_at,
      status: 'done'
    },
    {
      title: '2. Patient Arrived',
      subtitle: 'Triage Bay Check-in',
      timestamp: referral.arrived_at,
      status: activeStep >= 1 ? 'done' : 'pending'
    },
    {
      title: '3. Inpatient Admission',
      subtitle: 'Ward & Bed Placement',
      timestamp: isInProgress || isCompleted || isClosed ? referral.updated_at : null,
      status: activeStep >= 2 ? 'done' : activeStep === 1 ? 'active' : 'pending'
    },
    {
      title: '4. Care Completed',
      subtitle: 'Clinical Goals Met',
      timestamp: referral.completed_at,
      status: activeStep >= 3 ? 'done' : 'pending'
    },
    {
      title: '5. Dossier Closed',
      subtitle: 'Administrative Discharge',
      timestamp: referral.closed_at,
      status: activeStep >= 4 ? 'done' : 'pending'
    }
  ];

  const handleConfirmAdmission = async (e) => {
    e.preventDefault();
    if (!admissionNote.trim() || admissionNote.trim().length < 5) {
      setError('Please provide admission notes (minimum 5 characters).');
      return;
    }

    setAdmitting(true);
    setError(null);
    try {
      if (onAdmitPatient) {
        await onAdmitPatient({
          allocated_ward_department: admissionWard.trim() || 'General Inpatient Ward',
          assigned_bed_type: admissionBed,
          admission_notes: admissionNote.trim()
        });
      }
      setShowAdmitForm(false);
    } catch (err) {
      setError(err?.message || 'Failed to record ward admission');
    } finally {
      setAdmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6" data-testid="admission-record-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Inpatient Admission Record & Lifecycle Tracking
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Admission Reference: <strong className="font-mono text-slate-700 dark:text-slate-300">{referral.reference_number || referral.id}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AdmissionStatusBadge status={referral.status} />
        </div>
      </div>

      {/* Operational Lifecycle Stepper */}
      <div className="py-2">
        <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
          Referral Operational State Machine
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {steps.map((step, idx) => {
            const isCurrent = idx === activeStep;
            const isPassed = idx < activeStep;

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs transition-colors ${
                  isCurrent
                    ? 'bg-indigo-50/70 border-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-700'
                    : isPassed
                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {isPassed ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isCurrent ? (
                    <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className={isCurrent ? 'text-indigo-900 dark:text-indigo-200' : isPassed ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-600 dark:text-slate-400'}>
                    {step.title}
                  </span>
                </div>
                <div className="text-2xs text-slate-500 dark:text-slate-400">{step.subtitle}</div>
                {step.timestamp && (
                  <div className="text-2xs font-mono text-slate-400 dark:text-slate-500 mt-1">
                    {formatClinicalDate(step.timestamp, true)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Distinction & Operational Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Ward / Department Placement</span>
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>{referral.allocated_ward_department || 'Pending Department Assignment'}</span>
          </div>
          {onReassignDepartment && !isClosed && (
            <button
              type="button"
              onClick={onReassignDepartment}
              className="mt-2 text-2xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline block"
            >
              Modify / Reassign Department
            </button>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Assigned Bed Type</span>
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>{referral.assigned_bed_type || 'Standard Ward Bed'}</span>
          </div>
          <span className="text-2xs text-slate-400 mt-1 block">Inpatient capacity allocated</span>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Responsible Staff</span>
          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <User className="w-4 h-4 text-slate-500" />
            <span>
              {referral.receiving_clinician_first_name
                ? `Dr. ${referral.receiving_clinician_first_name} ${referral.receiving_clinician_last_name || ''}`
                : 'Hospital Inpatient Team'}
            </span>
          </div>
          <span className="text-2xs text-slate-400 mt-1 block">Attending specialist care</span>
        </div>
      </div>

      {/* Operational Ward Admission Action (for ARRIVED status awaiting placement) */}
      {isArrived && !isInProgress && !isCompleted && !isClosed && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Pending Operational Ward Admission</span>
            </div>
            {!showAdmitForm && (
              <button
                type="button"
                onClick={() => setShowAdmitForm(true)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Admit to Ward Now
              </button>
            )}
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            The patient has physically arrived at triage. Complete formal ward placement to officially admit the patient and initiate ongoing care tracking.
          </p>

          {showAdmitForm && (
            <form onSubmit={handleConfirmAdmission} className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800 space-y-3">
              {error && (
                <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receiving Ward / Department
                  </label>
                  <input
                    type="text"
                    value={admissionWard}
                    onChange={(e) => setAdmissionWard(e.target.value)}
                    placeholder="e.g. Ward 3B, Internal Medicine"
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bed Classification
                  </label>
                  <select
                    value={admissionBed}
                    onChange={(e) => setAdmissionBed(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="STANDARD">Standard Ward Bed</option>
                    <option value="EMERGENCY_OBSERVATION">Emergency Observation Unit</option>
                    <option value="ICU">Intensive Care Unit (ICU)</option>
                    <option value="ISOLATION">Isolation Ward</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Notes & Nursing Plan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={admissionNote}
                  onChange={(e) => setAdmissionNote(e.target.value)}
                  rows={2}
                  placeholder="Record initial ward placement observations, nursing instructions..."
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdmitForm(false)}
                  disabled={admitting}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={admitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  {admitting ? 'Admitting...' : 'Confirm Ward Admission'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default AdmissionRecordCard;
