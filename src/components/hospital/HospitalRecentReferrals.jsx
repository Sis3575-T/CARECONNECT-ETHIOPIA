import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function HospitalRecentReferrals({ referrals = [], onSelectReferral, onViewAll }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800">
          Recent Referrals
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-[#0284c7] hover:text-[#0369a1] flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-medium">
              <th className="pb-2 font-medium">Patient Name</th>
              <th className="pb-2 font-medium">From</th>
              <th className="pb-2 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {referrals.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectReferral && onSelectReferral(item)}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
              >
                <td className="py-2 font-semibold text-slate-800">
                  {item.patientName}
                </td>
                <td className="py-2 text-slate-600 font-medium">
                  {item.from}
                </td>
                <td className="py-2 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    item.status === 'Accepted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : item.status === 'Pending'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
