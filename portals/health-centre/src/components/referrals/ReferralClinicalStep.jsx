import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  HeartPulse,
  Activity,
  Ambulance,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Stethoscope,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { TextInput } from '@shared/components/forms/TextInput.jsx';
import { Textarea } from '@shared/components/forms/Textarea.jsx';
import { Checkbox } from '@shared/components/forms/Checkbox.jsx';

const PRIORITY_LEVELS = [
  {
    value: 'EMERGENCY',
    label: 'Emergency (STAT / Red)',
    description: 'Life or limb-threatening clinical deterioration. Target hospital response: < 2 hours.',
    accent: 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-rose-500/20'
  },
  {
    value: 'URGENT',
    label: 'Urgent (Yellow)',
    description: 'Severe condition requiring prompt specialist assessment within 24 hours.',
    accent: 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 ring-amber-500/20'
  },
  {
    value: 'ROUTINE',
    label: 'Routine (Green)',
    description: 'Elective or standard clinical referral. Hospital review within 7 days.',
    accent: 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
  }
];

export function ReferralClinicalStep({ clinicalData, onChange, onBack, onProceed }) {
  const [fieldErrors, setFieldErrors] = useState({});

  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...clinicalData,
      [name]: type === 'checkbox' ? checked : value
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handlePrioritySelect = (priority) => {
    onChange({
      ...clinicalData,
      priority
    });
  };

  const validate = () => {
    const errors = {};

    if (!clinicalData.primary_diagnosis || clinicalData.primary_diagnosis.trim().length < 2) {
      errors.primary_diagnosis = 'Primary diagnosis or clinical impression is required (minimum 2 characters)';
    }

    if (!clinicalData.reason_for_referral || clinicalData.reason_for_referral.trim().length < 5) {
      errors.reason_for_referral = 'Reason for referral is required (minimum 5 characters)';
    }

    if (!clinicalData.clinical_summary || clinicalData.clinical_summary.trim().length < 5) {
      errors.clinical_summary = 'Clinical history and summary is required (minimum 5 characters)';
    }

    // Vitals validation matching backend rules
    if (clinicalData.vitals_pulse_rate) {
      const pulse = Number(clinicalData.vitals_pulse_rate);
      if (isNaN(pulse) || pulse < 20 || pulse > 250) {
        errors.vitals_pulse_rate = 'Pulse rate must be between 20 and 250 bpm';
      }
    }

    if (clinicalData.vitals_respiratory_rate) {
      const resp = Number(clinicalData.vitals_respiratory_rate);
      if (isNaN(resp) || resp < 4 || resp > 80) {
        errors.vitals_respiratory_rate = 'Respiratory rate must be between 4 and 80 breaths/min';
      }
    }

    if (clinicalData.vitals_temperature) {
      const temp = Number(clinicalData.vitals_temperature);
      if (isNaN(temp) || temp < 25.0 || temp > 45.0) {
        errors.vitals_temperature = 'Body temperature must be between 25.0 and 45.0 °C';
      }
    }

    if (clinicalData.vitals_spo2) {
      const spo2 = Number(clinicalData.vitals_spo2);
      if (isNaN(spo2) || spo2 < 40 || spo2 > 100) {
        errors.vitals_spo2 = 'SpO2 oxygen saturation must be between 40 and 100%';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onProceed();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Section Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Step 2: Structured Clinical Referral Information</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Document the patient's presenting condition, clinical findings, vitals, and required urgency for specialist triage
        </p>
      </div>

      {/* Priority Urgency Selection (Clinician Determined) */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Clinical Priority & Triage Urgency *
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Select the clinical urgency tier according to Ethiopian National Referral Guidelines. Triage decision remains under clinical responsibility.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRIORITY_LEVELS.map((lvl) => {
            const isSelected = clinicalData.priority === lvl.value;
            return (
              <div
                key={lvl.value}
                onClick={() => handlePrioritySelect(lvl.value)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && handlePrioritySelect(lvl.value)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected ? `${lvl.accent} ring-2` : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {lvl.label}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-current bg-current' : 'border-slate-400'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {lvl.description}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Clinical Reason and Diagnosis */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Diagnosis & Reason for Referral
          </h3>
        </div>

        <div className="space-y-4">
          <TextInput
            label="Primary Diagnosis / Clinical Impression *"
            name="primary_diagnosis"
            value={clinicalData.primary_diagnosis}
            onChange={handleFieldChange}
            error={fieldErrors.primary_diagnosis}
            placeholder="e.g. Acute Coronary Syndrome, Obstructed Labor, Severe Diabetic Ketoacidosis"
            required
            helperText="Preliminary or confirmed clinical diagnosis"
          />

          <TextInput
            label="Reason for Referral / Chief Complaint *"
            name="reason_for_referral"
            value={clinicalData.reason_for_referral}
            onChange={handleFieldChange}
            error={fieldErrors.reason_for_referral}
            placeholder="e.g. Requires emergency cardiac catheterization / specialist surgical intervention"
            required
            helperText="State specific justification for hospital escalation"
          />

          <Textarea
            label="Clinical History, Examination & Relevant Findings *"
            name="clinical_summary"
            value={clinicalData.clinical_summary}
            onChange={handleFieldChange}
            error={fieldErrors.clinical_summary}
            placeholder="Document presenting symptoms, duration, pertinent physical examination findings, and known medical baseline..."
            rows={4}
            required
            helperText="Comprehensive summary for the receiving hospital triage clinician (minimum 5 characters)"
          />
        </div>
      </Card>

      {/* Structured Vitals Observations */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Activity className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Current Vital Observations (Optional but Recommended)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <TextInput
            label="Blood Pressure"
            name="vitals_blood_pressure"
            value={clinicalData.vitals_blood_pressure}
            onChange={handleFieldChange}
            placeholder="e.g. 120/80"
            helperText="mmHg"
          />

          <TextInput
            label="Pulse Rate"
            type="number"
            name="vitals_pulse_rate"
            value={clinicalData.vitals_pulse_rate}
            onChange={handleFieldChange}
            error={fieldErrors.vitals_pulse_rate}
            placeholder="bpm"
            min="20"
            max="250"
            helperText="20 - 250 bpm"
          />

          <TextInput
            label="Respiratory Rate"
            type="number"
            name="vitals_respiratory_rate"
            value={clinicalData.vitals_respiratory_rate}
            onChange={handleFieldChange}
            error={fieldErrors.vitals_respiratory_rate}
            placeholder="breaths/min"
            min="4"
            max="80"
            helperText="4 - 80 /min"
          />

          <TextInput
            label="Temperature"
            type="number"
            step="0.1"
            name="vitals_temperature"
            value={clinicalData.vitals_temperature}
            onChange={handleFieldChange}
            error={fieldErrors.vitals_temperature}
            placeholder="°C"
            min="25.0"
            max="45.0"
            helperText="25.0 - 45.0 °C"
          />

          <TextInput
            label="Oxygen Saturation"
            type="number"
            name="vitals_spo2"
            value={clinicalData.vitals_spo2}
            onChange={handleFieldChange}
            error={fieldErrors.vitals_spo2}
            placeholder="%"
            min="40"
            max="100"
            helperText="40 - 100 %"
          />
        </div>
      </Card>

      {/* Provisional Treatment & Ambulance Transport */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <HeartPulse className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Pre-Referral Treatment & Transport Requirements
          </h3>
        </div>

        <Textarea
          label="Provisional Treatment & Medications Given at Health Centre"
          name="provisional_treatment_given"
          value={clinicalData.provisional_treatment_given}
          onChange={handleFieldChange}
          placeholder="e.g. Aspirin 300mg PO given, IV Normal Saline 500ml bolus initiated, supplemental O2 at 4L/min..."
          rows={2}
          helperText="List all medications, fluids, oxygen, or emergency stabilization interventions administered prior to transfer"
        />

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <Checkbox
              label="Ambulance Transport Coordination Required"
              name="transport_required"
              checked={clinicalData.transport_required}
              onChange={handleFieldChange}
            />
            {clinicalData.transport_required && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <Ambulance className="w-3.5 h-3.5" />
                Ambulance Dispatch Alert
              </span>
            )}
          </div>

          {clinicalData.transport_required && (
            <TextInput
              label="Transport Medical Equipment / Special Instructions"
              name="transport_notes"
              value={clinicalData.transport_notes}
              onChange={handleFieldChange}
              placeholder="e.g. Requires continuous cardiac monitor, stretcher, oxygen cylinder"
            />
          )}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient Selection</span>
        </Button>

        <Button
          type="submit"
          variant="primary"
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white min-w-[170px] justify-center"
        >
          <span>Continue to Destination</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

export default ReferralClinicalStep;
