import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MapPin, Calendar, Phone, ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { PatientStatusBadge } from './PatientStatusBadge.jsx';
import { formatClinicalDate, formatEthiopianPhone, formatPatientId } from '@shared/utils/formatters.js';

export function PatientTable({ patients = [], onSelectPatient }) {
  const navigate = useNavigate();

  const handleRowClick = (patientId) => {
    if (onSelectPatient) {
      onSelectPatient(patientId);
    } else {
      navigate(`/patients/${encodeURIComponent(patientId)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="px-6 py-3.5">Patient Details</th>
              <th scope="col" className="px-4 py-3.5">Reference ID</th>
              <th scope="col" className="px-4 py-3.5">Demographics</th>
              <th scope="col" className="px-4 py-3.5">Location</th>
              <th scope="col" className="px-4 py-3.5">Contact</th>
              <th scope="col" className="px-4 py-3.5">Status</th>
              <th scope="col" className="px-4 py-3.5">Registered</th>
              <th scope="col" className="px-6 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {patients.map((patient) => {
              const fullName = patient.full_name || [patient.first_name, patient.father_name, patient.grandfather_name].filter(Boolean).join(' ') || 'Unnamed Patient';
              const ageDisplay = patient.age_years !== null && patient.age_years !== undefined
                ? `${patient.age_years} yrs ${patient.is_dob_estimated ? '(est)' : ''}`
                : 'Age —';
              const locationDisplay = [patient.woreda, patient.region].filter(Boolean).join(', ') || '—';

              return (
                <tr
                  key={patient.id}
                  onClick={() => handleRowClick(patient.id)}
                  className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-semibold flex items-center justify-center shrink-0 text-xs">
                        {patient.first_name ? patient.first_name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {fullName}
                        </div>
                        {patient.national_id && (
                          <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" />
                            <span>Fayda: {patient.national_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                    {formatPatientId(patient.id)}
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <div className="text-slate-900 dark:text-slate-200 font-medium">
                      {patient.gender || '—'}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {ageDisplay}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[150px]">{locationDisplay}</span>
                    </div>
                    {patient.kebele && (
                      <div className="text-slate-400 dark:text-slate-500 mt-0.5 pl-4 text-[11px]">
                        {patient.kebele}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-300">
                    {patient.phone_number ? (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatEthiopianPhone(patient.phone_number)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No phone</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <PatientStatusBadge status={patient.status} />
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                    {formatClinicalDate(patient.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(patient.id);
                      }}
                      className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 inline-flex items-center space-x-1"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Profile</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {patients.map((patient) => {
          const fullName = patient.full_name || [patient.first_name, patient.father_name, patient.grandfather_name].filter(Boolean).join(' ') || 'Unnamed Patient';
          const ageDisplay = patient.age_years !== null && patient.age_years !== undefined
            ? `${patient.age_years} yrs ${patient.is_dob_estimated ? '(est)' : ''}`
            : 'Age —';

          return (
            <div
              key={patient.id}
              onClick={() => handleRowClick(patient.id)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm active:bg-slate-50 dark:active:bg-slate-800/80 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-base">
                    {fullName}
                  </h4>
                  <div className="font-mono text-xs text-sky-600 dark:text-sky-400 mt-0.5">
                    {formatPatientId(patient.id)}
                  </div>
                </div>
                <PatientStatusBadge status={patient.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 my-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400">Demographics: </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{patient.gender || '—'}, {ageDisplay}</span>
                </div>
                <div>
                  <span className="text-slate-400">Phone: </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {patient.phone_number ? formatEthiopianPhone(patient.phone_number) : 'None'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Location: </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {[patient.woreda, patient.region].filter(Boolean).join(', ') || '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span>Reg: {formatClinicalDate(patient.created_at)}</span>
                <span className="text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-1">
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PatientTable;
