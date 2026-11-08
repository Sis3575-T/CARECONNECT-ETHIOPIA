import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building,
  Calendar,
  Clock,
  Eye,
  User,
  AlertCircle
} from 'lucide-react';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';
import HospitalStatusBadge from './HospitalStatusBadge.jsx';
import HospitalPriorityBadge from './HospitalPriorityBadge.jsx';

export default function HospitalReferralTable({ referrals = [], onSelectReferral }) {
  const navigate = useNavigate();

  const handleRowClick = (ref) => {
    if (onSelectReferral) {
      onSelectReferral(ref);
    } else {
      navigate(`/referrals/${ref.id}`);
    }
  };

  return (
    <div>
      {/* Desktop Table View (Hidden on small mobile screens) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Incoming referrals queue">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-900/40">
              <th scope="col" className="py-3 px-3.5">Reference</th>
              <th scope="col" className="py-3 px-3.5">Patient Details</th>
              <th scope="col" className="py-3 px-3.5">Referring Health Centre</th>
              <th scope="col" className="py-3 px-3.5">Specialty / Service</th>
              <th scope="col" className="py-3 px-3.5">Urgency</th>
              <th scope="col" className="py-3 px-3.5">Status</th>
              <th scope="col" className="py-3 px-3.5">Submitted</th>
              <th scope="col" className="py-3 px-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {referrals.map((ref) => {
              const refCode = ref.reference_number || ref.id?.slice(0, 8);
              const patientName = ref.patient_name || ref.patientName || 'Unnamed Patient';
              const originFacility = ref.origin_facility_name || ref.referringFacility || 'Health Centre';
              const serviceRequested = ref.service_category || ref.service || ref.requested_service || 'General Inpatient';
              const submittedTime = ref.submitted_at || ref.created_at;

              return (
                <tr
                  key={ref.id}
                  onClick={() => handleRowClick(ref)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900 dark:text-white">
                    {refCode}
                  </td>
                  <td className="py-3.5 px-3.5">
                    <p className="font-semibold text-slate-900 dark:text-white">{patientName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {ref.patient_gender || ref.gender || '—'}, {ref.patient_age ? `${ref.patient_age} yrs` : 'Age N/A'}
                    </p>
                  </td>
                  <td className="py-3.5 px-3.5 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px]">{originFacility}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3.5 text-slate-600 dark:text-slate-300 font-medium">
                    {serviceRequested}
                  </td>
                  <td className="py-3.5 px-3.5">
                    <HospitalPriorityBadge priority={ref.priority} />
                  </td>
                  <td className="py-3.5 px-3.5">
                    <HospitalStatusBadge status={ref.status} />
                  </td>
                  <td className="py-3.5 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                    {submittedTime ? formatRelativeTime(submittedTime) : 'Recently'}
                  </td>
                  <td className="py-3.5 px-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(ref);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer group-hover:shadow-xs"
                      aria-label={`Review referral ${refCode}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Rendered on mobile screens) */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {referrals.map((ref) => {
          const refCode = ref.reference_number || ref.id?.slice(0, 8);
          const patientName = ref.patient_name || ref.patientName || 'Unnamed Patient';
          const originFacility = ref.origin_facility_name || ref.referringFacility || 'Health Centre';
          const serviceRequested = ref.service_category || ref.service || ref.requested_service || 'General Inpatient';
          const submittedTime = ref.submitted_at || ref.created_at;

          return (
            <div
              key={ref.id}
              onClick={() => handleRowClick(ref)}
              className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                  {refCode}
                </span>
                <div className="flex items-center gap-1.5">
                  <HospitalPriorityBadge priority={ref.priority} />
                  <HospitalStatusBadge status={ref.status} />
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{patientName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {ref.patient_gender || ref.gender || '—'}, {ref.patient_age ? `${ref.patient_age} yrs` : 'Age unrecorded'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="truncate max-w-[180px]">{originFacility}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{serviceRequested}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Received: {submittedTime ? formatRelativeTime(submittedTime) : 'Recently'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  Review Details <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
