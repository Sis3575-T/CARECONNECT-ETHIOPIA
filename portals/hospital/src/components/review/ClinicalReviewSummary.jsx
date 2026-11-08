import React from 'react';
import {
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplet,
  Brain,
  Building,
  Phone,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Eye,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { formatClinicalDate } from '@shared/utils/formatters.js';

/**
 * Evaluates whether a physiological vital sign exceeds clinical safety parameters
 */
function evaluateVitalSignAlert(type, value) {
  if (value === undefined || value === null || value === '' || value === '—') return null;
  const num = parseFloat(value);

  switch (type) {
    case 'HR': // Heart Rate (bpm)
      if (isNaN(num)) return null;
      if (num > 120 || num < 50) return { level: 'critical', text: num > 120 ? 'Tachycardia' : 'Bradycardia' };
      if (num > 100 || num < 60) return { level: 'warning', text: 'Abnormal rate' };
      return { level: 'normal', text: 'Normal' };

    case 'SPO2': // Oxygen Saturation (%)
      if (isNaN(num)) return null;
      if (num < 90) return { level: 'critical', text: 'Severe Hypoxia' };
      if (num < 95) return { level: 'warning', text: 'Low Saturation' };
      return { level: 'normal', text: 'Adequate' };

    case 'TEMP': // Temperature (°C)
      if (isNaN(num)) return null;
      if (num >= 39.0 || num <= 35.0) return { level: 'critical', text: num >= 39.0 ? 'High Pyrexia' : 'Hypothermia' };
      if (num >= 38.0 || num <= 36.0) return { level: 'warning', text: 'Sub-febrile' };
      return { level: 'normal', text: 'Normothermic' };

    case 'RR': // Respiratory Rate (breaths/min)
      if (isNaN(num)) return null;
      if (num > 30 || num < 10) return { level: 'critical', text: num > 30 ? 'Tachypnea' : 'Bradypnea' };
      if (num > 22 || num < 12) return { level: 'warning', text: 'Elevated rate' };
      return { level: 'normal', text: 'Normal' };

    case 'BP': // Blood Pressure string (e.g. "120/80")
      if (typeof value === 'string' && value.includes('/')) {
        const parts = value.split('/').map(p => parseInt(p.trim(), 10));
        const [sys, dia] = parts;
        if (!isNaN(sys) && !isNaN(dia)) {
          if (sys >= 180 || dia >= 110 || sys < 90) return { level: 'critical', text: sys < 90 ? 'Hypotension' : 'Hypertensive Crisis' };
          if (sys >= 140 || dia >= 90) return { level: 'warning', text: 'Elevated BP' };
          return { level: 'normal', text: 'Optimal' };
        }
      }
      return null;

    default:
      return null;
  }
}

export default function ClinicalReviewSummary({ referral, documents = [] }) {
  if (!referral) return null;

  const patientName = referral.patient_name || referral.patientName || 'Unnamed Patient';
  const patientId = referral.patient_id ? `${referral.patient_id.slice(0, 8)}...` : 'N/A';
  const faydaId = referral.patient_fayda_id
    ? `••••-••••-${referral.patient_fayda_id.slice(-4)}`
    : 'Not registered';

  const vitals = referral.vitals || {};
  const bpVal = referral.vitals_blood_pressure || vitals.blood_pressure || vitals.bp || '—';
  const hrVal = referral.vitals_pulse_rate || referral.vitals_heart_rate || vitals.heart_rate || vitals.pulse_rate || '—';
  const rrVal = referral.vitals_respiratory_rate || vitals.respiratory_rate || vitals.rr || '—';
  const tempVal = referral.vitals_temperature || vitals.temperature || vitals.temp || '—';
  const spo2Val = referral.vitals_oxygen_saturation || vitals.oxygen_saturation || vitals.spo2 || '—';
  const avpuVal = referral.vitals_avpu || vitals.avpu || referral.consciousness_level || 'Alert (A)';

  const bpAlert = evaluateVitalSignAlert('BP', bpVal);
  const hrAlert = evaluateVitalSignAlert('HR', hrVal);
  const rrAlert = evaluateVitalSignAlert('RR', rrVal);
  const tempAlert = evaluateVitalSignAlert('TEMP', tempVal);
  const spo2Alert = evaluateVitalSignAlert('SPO2', spo2Val);

  const hasCriticalVital = [bpAlert, hrAlert, rrAlert, tempAlert, spo2Alert].some(a => a?.level === 'critical');

  return (
    <div className="space-y-6">
      {/* Critical Physiological Instability Warning */}
      {hasCriticalVital && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-600 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Physiological Triage Alert: Abnormal Vital Parameter Detected
            </h4>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              One or more recorded baseline vitals exceed normal ranges. Urgent physician evaluation and stabilization bed readiness advised.
            </p>
          </div>
        </div>
      )}

      {/* Patient Demographics & Identification */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Patient Identification & Catchment Origin</h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Internal ID: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{patientId}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
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

        {/* Emergency Contact & Contact details */}
        {(referral.patient_phone || referral.emergency_contact_phone) && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
            {referral.patient_phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Patient Contact: <strong className="font-mono text-slate-800 dark:text-slate-200">{referral.patient_phone}</strong></span>
              </div>
            )}
            {referral.emergency_contact_phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Emergency Contact: <strong className="font-mono text-slate-800 dark:text-slate-200">{referral.emergency_contact_name || 'Relative'} ({referral.emergency_contact_phone})</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinical Presentation & Indications Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Stethoscope className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Clinical Presentation & Triage Indications</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Primary Clinical Diagnosis</span>
            <p className="font-bold text-slate-900 dark:text-white mt-1 text-sm bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {referral.primary_diagnosis || 'Clinical evaluation required upon arrival'}
            </p>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Secondary Diagnoses / Comorbidities</span>
            <p className="text-slate-800 dark:text-slate-200 mt-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {referral.secondary_diagnosis || referral.comorbidities || 'None documented by referring clinician.'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Chief Complaint & Clinical Progression Narrative</span>
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
            {referral.clinical_summary || referral.chief_complaint || referral.reason_for_referral || 'No narrative clinical summary recorded.'}
          </div>
        </div>

        {referral.medications_administered && (
          <div className="space-y-1.5 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Pre-Transfer Interventions & Medications Given</span>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200">
              {referral.medications_administered}
            </div>
          </div>
        )}
      </div>

      {/* Physiological Vital Signs Matrix */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Physiological Vital Signs</h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Recorded at Referring Facility
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Blood Pressure */}
          <div className={`p-3 rounded-xl border ${
            bpAlert?.level === 'critical'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
              : bpAlert?.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Blood Pressure</span>
              <Heart className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1">
              {bpVal} {bpVal !== '—' && <span className="text-[10px] font-normal text-slate-500">mmHg</span>}
            </p>
            {bpAlert && (
              <span className={`text-[10px] font-bold mt-1 inline-block ${
                bpAlert.level === 'critical' ? 'text-rose-600 dark:text-rose-400' : bpAlert.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {bpAlert.text}
              </span>
            )}
          </div>

          {/* Heart Rate / Pulse */}
          <div className={`p-3 rounded-xl border ${
            hrAlert?.level === 'critical'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
              : hrAlert?.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Heart Rate</span>
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1">
              {hrVal} {hrVal !== '—' && <span className="text-[10px] font-normal text-slate-500">bpm</span>}
            </p>
            {hrAlert && (
              <span className={`text-[10px] font-bold mt-1 inline-block ${
                hrAlert.level === 'critical' ? 'text-rose-600 dark:text-rose-400' : hrAlert.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {hrAlert.text}
              </span>
            )}
          </div>

          {/* Respiratory Rate */}
          <div className={`p-3 rounded-xl border ${
            rrAlert?.level === 'critical'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
              : rrAlert?.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Resp Rate</span>
              <Wind className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1">
              {rrVal} {rrVal !== '—' && <span className="text-[10px] font-normal text-slate-500">/min</span>}
            </p>
            {rrAlert && (
              <span className={`text-[10px] font-bold mt-1 inline-block ${
                rrAlert.level === 'critical' ? 'text-rose-600 dark:text-rose-400' : rrAlert.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {rrAlert.text}
              </span>
            )}
          </div>

          {/* Oxygen Saturation SpO2 */}
          <div className={`p-3 rounded-xl border ${
            spo2Alert?.level === 'critical'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
              : spo2Alert?.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>SpO2</span>
              <Droplet className="w-3.5 h-3.5 text-cyan-500" />
            </div>
            <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1">
              {spo2Val} {spo2Val !== '—' && <span className="text-[10px] font-normal text-slate-500">%</span>}
            </p>
            {spo2Alert && (
              <span className={`text-[10px] font-bold mt-1 inline-block ${
                spo2Alert.level === 'critical' ? 'text-rose-600 dark:text-rose-400' : spo2Alert.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {spo2Alert.text}
              </span>
            )}
          </div>

          {/* Temperature */}
          <div className={`p-3 rounded-xl border ${
            tempAlert?.level === 'critical'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
              : tempAlert?.level === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Temperature</span>
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="font-mono text-base font-black text-slate-900 dark:text-white mt-1">
              {tempVal} {tempVal !== '—' && <span className="text-[10px] font-normal text-slate-500">°C</span>}
            </p>
            {tempAlert && (
              <span className={`text-[10px] font-bold mt-1 inline-block ${
                tempAlert.level === 'critical' ? 'text-rose-600 dark:text-rose-400' : tempAlert.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
              }`}>
                {tempAlert.text}
              </span>
            )}
          </div>

          {/* Consciousness / AVPU */}
          <div className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Consciousness</span>
              <Brain className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <p className="font-bold text-slate-900 dark:text-white mt-1 truncate">
              {avpuVal}
            </p>
            <span className="text-[10px] text-slate-500 font-medium mt-1 inline-block">AVPU Scale</span>
          </div>
        </div>
      </div>

      {/* Supporting Diagnostic Documents */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attached Diagnostic Documents & Slips</h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {documents.length} Attachment{documents.length === 1 ? '' : 's'}
          </span>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
            No diagnostic imaging or laboratory slips were attached to this referral.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {documents.map((doc) => (
              <div key={doc.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {doc.file_name || doc.name || 'Diagnostic Attachment'}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
                        {doc.document_type || doc.category || 'CLINICAL'}
                      </span>
                      {doc.file_size && <span>{(doc.file_size / 1024).toFixed(0)} KB</span>}
                      {doc.created_at && <span>{formatClinicalDate(doc.created_at)}</span>}
                    </div>
                  </div>
                </div>

                <a
                  href={doc.file_url || `/api/v1/referrals/${referral.id}/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Slip</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referring Health Centre Origin Facility Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Building className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Referring Facility & Clinician Contacts</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Health Centre Name</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
              {referral.origin_facility_name || 'Referring Health Centre'}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Referring Clinician</span>
            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
              {referral.referring_clinician_name || referral.referring_user_name || 'Health Centre Medical Staff'}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Clinician Direct Line / Dispatch</span>
            <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {referral.referring_clinician_phone || referral.clinician_phone || 'Facility Dispatch Desk'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
