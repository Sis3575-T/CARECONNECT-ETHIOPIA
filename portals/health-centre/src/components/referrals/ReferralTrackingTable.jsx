import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  ArrowRight,
  Clock,
  User,
  Building2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  Ambulance,
  FileQuestion
} from 'lucide-react';
import { ReferralStatusBadge } from './ReferralStatusBadge.jsx';
import { ReferralPriorityBadge } from './ReferralPriorityBadge.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export function ReferralTrackingTable({ referrals = [], onSelectReferral }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">Healthcare Referrals Tracking Registry</caption>
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th scope="col" className="px-4 py-3.5">Referral Ref</th>
              <th scope="col" className="px-4 py-3.5">Patient Details</th>
              <th scope="col" className="px-4 py-3.5">Destination Hospital</th>
              <th scope="col" className="px-4 py-3.5">Urgency</th>
              <th scope="col" className="px-4 py-3.5">Current Status</th>
              <th scope="col" className="px-4 py-3.5">Submission Date</th>
              <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {referrals.map((r) => {
              const refCode = r.reference_number || r.referral_code || r.id;
              const patientName =
                r.patient_name ||
                r.patient_full_name ||
                r.patientName ||
                [r.patient_first_name, r.patient_father_name].filter(Boolean).join(' ') ||
                'Patient record';
              const hospitalName =
                r.destination_facility_name ||
                r.destination_hospital_name ||
                r.receivingFacility ||
                'Destination Hospital';
              const specialty = r.required_specialty || r.service || 'Clinical Specialty';
              const hasInfoRequest = r.has_pending_info_request || r.status === 'INFO_REQUESTED';

              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/referrals/${r.id}`)}
                  className="hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                >
                  {/* Reference & transport indicator */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="font-mono font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                      {refCode}
                    </div>
                    {r.transport_required && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                        <Ambulance className="w-3 h-3" />
                        <span>Transport Needed</span>
                      </span>
                    )}
                  </td>

                  {/* Patient Name & Identifier */}
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {patientName}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{r.patient_gender || r.gender || '—'}</span>
                      {r.patient_age || r.age ? <span>• {r.patient_age || r.age} yrs</span> : null}
                      {r.patient_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${r.patient_id}`);
                          }}
                          className="text-sky-600 hover:underline font-mono"
                          title="View patient profile"
                        >
                          [Profile]
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Destination Hospital & Specialty */}
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {hospitalName}
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block mt-0.5">
                      {specialty}
                    </span>
                  </td>

                  {/* Urgency Priority */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <ReferralPriorityBadge priority={r.priority || r.urgency} />
                  </td>

                  {/* Status & Action Badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="space-y-1">
                      <ReferralStatusBadge status={r.status} />
                      {hasInfoRequest && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Action: Info Requested</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Date & Relative Time */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    <div>{formatClinicalDate(r.created_at || r.date)}</div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {formatRelativeTime(r.created_at || r.date)}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/referrals/${r.id}`);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sky-600 dark:text-sky-400 font-medium inline-flex items-center gap-1 transition-colors"
                      aria-label={`View referral tracking details for ${refCode}`}
                    >
                      <span>Track</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {referrals.map((r) => {
          const refCode = r.reference_number || r.referral_code || r.id;
          const patientName =
            r.patient_name ||
            r.patient_full_name ||
            r.patientName ||
            [r.patient_first_name, r.patient_father_name].filter(Boolean).join(' ') ||
            'Patient record';
          const hospitalName =
            r.destination_facility_name ||
            r.destination_hospital_name ||
            r.receivingFacility ||
            'Destination Hospital';
          const specialty = r.required_specialty || r.service || 'Clinical Specialty';
          const hasInfoRequest = r.has_pending_info_request || r.status === 'INFO_REQUESTED';

          return (
            <div
              key={r.id}
              onClick={() => navigate(`/referrals/${r.id}`)}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 cursor-pointer hover:border-sky-500 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                  {refCode}
                </span>
                <ReferralPriorityBadge priority={r.priority || r.urgency} />
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {patientName}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {[r.patient_gender || r.gender, r.patient_age ? `${r.patient_age} yrs` : null].filter(Boolean).join(' • ')}
                </div>
              </div>

              <div className="text-xs space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium truncate">{hospitalName}</span>
                </div>
                <div className="text-[11px] text-indigo-600 dark:text-indigo-400 pl-5">
                  Dept: {specialty}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <ReferralStatusBadge status={r.status} />
                <span className="text-[11px] text-slate-400">
                  {formatClinicalDate(r.created_at || r.date)}
                </span>
              </div>

              {hasInfoRequest && (
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 text-xs flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Action Required: Hospital requested additional details</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReferralTrackingTable;
