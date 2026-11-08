import React from 'react';
import {
  User,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  HeartPulse,
  Baby,
  Building2,
  Clock,
  IdCard,
  AlertCircle
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { PatientStatusBadge } from './PatientStatusBadge.jsx';
import { formatClinicalDate, formatEthiopianPhone, formatPatientId } from '@shared/utils/formatters.js';

export function PatientOverviewCard({ patient }) {
  if (!patient) return null;

  const fullName = patient.full_name || [patient.first_name, patient.father_name, patient.grandfather_name].filter(Boolean).join(' ') || 'Unnamed Patient';
  const ageDisplay = patient.age_years !== null && patient.age_years !== undefined
    ? `${patient.age_years} years ${patient.is_dob_estimated ? '(Estimated DOB)' : ''}`
    : 'Not Recorded';

  const dobDisplay = patient.date_of_birth
    ? formatClinicalDate(patient.date_of_birth)
    : patient.is_dob_estimated ? 'Estimated from age' : 'Not Recorded';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1: Primary Identity & Demographics */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold text-xl flex items-center justify-center border border-sky-200/60 dark:border-sky-900/40">
            {patient.first_name ? patient.first_name.charAt(0).toUpperCase() : 'P'}
          </div>
          <PatientStatusBadge status={patient.status} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {fullName}
          </h2>
          <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400 mt-1 select-all">
            {formatPatientId(patient.id)}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-400">Biological Sex:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{patient.gender || '—'}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-400">Age:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{ageDisplay}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-400">Date of Birth:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{dobDisplay}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
            <span className="text-slate-400">Primary Language:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{patient.primary_language || 'Amharic'}</span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-400">Registered Facility:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]" title={patient.registered_facility_name || patient.registered_facility_id}>
              {patient.registered_facility_name || patient.registered_facility_id || 'Health Centre'}
            </span>
          </div>
        </div>

        {patient.is_pregnant && (
          <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 flex items-center gap-2.5 text-xs text-pink-900 dark:text-pink-200">
            <Baby className="w-4 h-4 text-pink-600 shrink-0" />
            <div>
              <span className="font-semibold">Maternal Record: Active Pregnancy</span>
              {patient.edd_date && (
                <div className="text-[11px] text-pink-700 dark:text-pink-300">
                  EDD: {formatClinicalDate(patient.edd_date)}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Column 2: Identifiers & Contact Geography */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Official Identifiers</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Fayda National ID:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {patient.national_id || 'None Recorded'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Kebele Resident ID:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {patient.kebele_id || 'None Recorded'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Facility Medical Record Number (MRN):</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {patient.medical_record_number || 'None Recorded'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Contact & Geography</span>
          </h3>
          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{patient.phone_number ? formatEthiopianPhone(patient.phone_number) : 'No primary phone recorded'}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                {[
                  patient.house_number ? `House ${patient.house_number}` : null,
                  patient.kebele,
                  patient.woreda,
                  patient.subcity_zone,
                  patient.region
                ].filter(Boolean).join(', ') || 'Address not recorded'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Column 3: Clinical Baseline & Emergency Contact */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Clinical Baseline</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/50">
              <span className="text-slate-400">Blood Group:</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                {patient.blood_type || 'Unknown'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Known Allergies:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {patient.known_allergies || 'No allergies recorded'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">Chronic Illnesses:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {patient.chronic_conditions || 'None reported'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Primary Emergency Contact</span>
          </h3>
          {patient.emergency_contacts && patient.emergency_contacts.length > 0 ? (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white">
                {patient.emergency_contacts[0].full_name}
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Relationship: <span className="font-medium text-slate-700 dark:text-slate-300">{patient.emergency_contacts[0].relationship || 'Family'}</span>
              </div>
              <div className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 pt-0.5">
                <Phone className="w-3 h-3" />
                <span>{formatEthiopianPhone(patient.emergency_contacts[0].phone_number)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No emergency contact on file</p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default PatientOverviewCard;
