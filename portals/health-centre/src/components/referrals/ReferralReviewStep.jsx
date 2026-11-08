import React from 'react';
import {
  FileText,
  User,
  Building2,
  Stethoscope,
  Paperclip,
  ArrowLeft,
  Send,
  AlertTriangle,
  Flame,
  Clock,
  Ambulance,
  Edit2,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';

function formatBytes(bytes) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function ReferralReviewStep({
  patient,
  clinicalData,
  destinationData,
  attachedFiles,
  facilityName,
  submitting,
  submissionError,
  onBack,
  onJumpToStep,
  onSubmit
}) {
  const isEmergency = clinicalData.priority === 'EMERGENCY';
  const isUrgent = clinicalData.priority === 'URGENT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Step 5: Review & Submit Clinical Referral</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Verify all clinical, patient, and destination information prior to secure electronic transmission
        </p>
      </div>

      {submissionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Referral Submission Failed</p>
            <p className="mt-0.5">{submissionError}</p>
          </div>
        </div>
      )}

      {/* Priority Alert Banner */}
      {isEmergency && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300">
            <Flame className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider">Emergency Priority Referral</span>
              <p className="text-[11px] text-rose-700 dark:text-rose-400">
                This referral will trigger immediate clinical triage notifications at {destinationData.destination_facility_name || 'the destination hospital'}.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold text-[10px] tracking-wider uppercase shrink-0">
            Emergency
          </span>
        </div>
      )}

      {isUrgent && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider">Urgent Priority Referral</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Requires clinical evaluation and bed allocation within 24 hours.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-amber-500 text-white font-bold text-[10px] tracking-wider uppercase shrink-0">
            Urgent
          </span>
        </div>
      )}

      {/* Section 1: Patient Information */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
            <User className="w-4 h-4 text-sky-600" />
            <span>1. Patient Demographic & Identity</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onJumpToStep(1)}
            disabled={submitting}
            className="text-xs text-sky-600 hover:text-sky-700 h-7 px-2"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Change
          </Button>
        </div>

        {patient ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block">Full Patient Name</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {[patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Patient Ref / MRN</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {patient.patient_reference || patient.mrn || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">National / Kebele ID</span>
              <span className="text-slate-700 dark:text-slate-300">
                {patient.national_id || patient.kebele_id || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Gender & Age</span>
              <span className="text-slate-700 dark:text-slate-300">
                {patient.gender || 'N/A'} {patient.age ? `(${patient.age} yrs)` : ''}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Phone Number</span>
              <span className="text-slate-700 dark:text-slate-300">
                {patient.phone || 'No phone'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Location</span>
              <span className="text-slate-700 dark:text-slate-300">
                {[patient.woreda, patient.region].filter(Boolean).join(', ') || 'Ethiopia'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Emergency Contact</span>
              <span className="text-slate-700 dark:text-slate-300">
                {patient.emergency_contact_name
                  ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || 'No tel'})`
                  : 'None listed'}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Referring Tenancy</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {facilityName}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-rose-500">No patient selected.</p>
        )}
      </Card>

      {/* Section 2: Clinical Information */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            <span>2. Clinical Summary & Vitals</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onJumpToStep(2)}
            disabled={submitting}
            className="text-xs text-sky-600 hover:text-sky-700 h-7 px-2"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Primary Diagnosis</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {clinicalData.primary_diagnosis || 'Not specified'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Reason for Referral</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {clinicalData.reason_for_referral || 'Not specified'}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-[11px] text-slate-400 block">Clinical Summary & History</span>
            <p className="text-slate-800 dark:text-slate-200 mt-0.5 whitespace-pre-wrap leading-relaxed">
              {clinicalData.clinical_summary || 'No clinical summary entered.'}
            </p>
          </div>
        </div>

        {/* Vital Signs Grid */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Recorded Vital Signs
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {clinicalData.vitals_blood_pressure || '--/--'}
              </span>
              <span className="text-[9px] text-slate-400 block">mmHg</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Heart Rate</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {clinicalData.vitals_pulse_rate || '--'}
              </span>
              <span className="text-[9px] text-slate-400 block">bpm</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Resp Rate</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {clinicalData.vitals_respiratory_rate || '--'}
              </span>
              <span className="text-[9px] text-slate-400 block">breaths/min</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Temperature</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {clinicalData.vitals_temperature || '--'}
              </span>
              <span className="text-[9px] text-slate-400 block">°C</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
              <span className="text-[10px] text-slate-400 block">Oxygen Sat</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {clinicalData.vitals_spo2 ? `${clinicalData.vitals_spo2}%` : '--%'}
              </span>
              <span className="text-[9px] text-slate-400 block">SpO2</span>
            </div>
          </div>
        </div>

        {/* Provisional Treatment & Transport */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Provisional Treatment Given</span>
            <p className="text-slate-800 dark:text-slate-200 mt-0.5">
              {clinicalData.provisional_treatment_given || 'No provisional treatment documented.'}
            </p>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Ambulance Transport Required</span>
            <div className="flex items-center gap-2 mt-0.5">
              {clinicalData.transport_required ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                  <Ambulance className="w-3.5 h-3.5 text-amber-600" />
                  Yes - Emergency Transport Required
                </span>
              ) : (
                <span className="text-slate-500">No (Standard patient transfer)</span>
              )}
            </div>
            {clinicalData.transport_required && clinicalData.transport_notes && (
              <p className="text-[11px] text-slate-500 mt-1 italic">
                Notes: {clinicalData.transport_notes}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Section 3: Destination Hospital & Department */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>3. Destination Hospital & Target Department</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onJumpToStep(3)}
            disabled={submitting}
            className="text-xs text-sky-600 hover:text-sky-700 h-7 px-2"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block">Destination Hospital</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {destinationData.destination_facility_name || 'Hospital ID: ' + destinationData.destination_facility_id}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">Target Specialty Department</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {destinationData.required_specialty || 'General Triage / Admitting'}
            </span>
          </div>
        </div>
      </Card>

      {/* Section 4: Attachments */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs">
            <Paperclip className="w-4 h-4 text-slate-500" />
            <span>4. Supporting Documents ({attachedFiles.length})</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onJumpToStep(4)}
            disabled={submitting}
            className="text-xs text-sky-600 hover:text-sky-700 h-7 px-2"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </div>

        {attachedFiles.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {attachedFiles.map((att) => (
              <div key={att.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-900 dark:text-white">{att.fileName}</span>
                  <span className="text-[11px] text-slate-400">({formatBytes(att.fileSize)})</span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {att.documentType}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No files attached to this referral.</p>
        )}
      </Card>

      {/* Compliance Certification */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p>
          By submitting this referral, you confirm that the clinical findings, vitals, and destination hospital assignment have been reviewed in accordance with the <strong>Ethiopian Federal Ministry of Health Clinical Referral Guidelines</strong>. This record will be securely transmitted to the destination hospital's electronic triage queue.
        </p>
      </div>

      {/* Navigation & Submit Action */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Attachments</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={submitting || !patient || !destinationData.destination_facility_id}
          className={`inline-flex items-center gap-2 text-white min-w-[200px] justify-center ${
            isEmergency
              ? 'bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-500/30'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {submitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              <span>Transmitting Referral...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Submit Digital Referral</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default ReferralReviewStep;
