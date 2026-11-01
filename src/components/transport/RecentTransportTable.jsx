import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';

export default function RecentTransportTable({ requests = [], onSelectRequest, onViewAll }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800">
          Recent Transport Requests
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
              <th className="pb-2.5 font-medium">Patient Name</th>
              <th className="pb-2.5 font-medium">From &rarr; To</th>
              <th className="pb-2.5 font-medium">Status</th>
              <th className="pb-2.5 font-medium text-right">ETA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {requests.map((item) => (
              <tr
                key={item.id}
                onClick={() => onSelectRequest && onSelectRequest(item)}
                className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
              >
                <td className="py-2.5 font-semibold text-slate-800">
                  {item.patientName}
                </td>
                <td className="py-2.5 text-slate-600 font-medium flex items-center gap-1.5">
                  <span>{item.from}</span>
                  <span className="text-slate-400">&rarr;</span>
                  <span className="font-semibold text-slate-700">{item.to}</span>
                </td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                    item.status === 'In Transit'
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      : item.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'In Transit' ? 'bg-cyan-500 animate-pulse' : 'bg-current'
                    }`} />
                    <span>{item.status}</span>
                  </span>
                </td>
                <td className="py-2.5 text-slate-700 font-bold text-right">
                  {item.eta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
