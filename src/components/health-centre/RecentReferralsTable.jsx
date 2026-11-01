import React from 'react';
import { ArrowRight, ChevronRight, User } from 'lucide-react';

export default function RecentReferralsTable({ referrals = [], onSelectReferral, onViewAll }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      {/* Header with Title and "View All ->" Link */}
      <div className="flex items-center justify-between mb-3">
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

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-medium">
              <th className="pb-2.5 font-medium">Patient Name</th>
              <th className="pb-2.5 font-medium">Service</th>
              <th className="pb-2.5 font-medium">Status</th>
              <th className="pb-2.5 font-medium text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {referrals.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectReferral && onSelectReferral(item)}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
              >
                <td className="py-2.5 font-semibold text-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center text-[10px] font-bold">
                    {item.patientName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span>{item.patientName}</span>
                </td>
                <td className="py-2.5 text-slate-600 font-medium">
                  {item.service}
                </td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    item.status === 'Accepted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : item.status === 'Pending'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : item.status === 'Rejected'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-2.5 text-slate-500 font-medium text-right">
                  {item.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
