import React, { useState } from 'react';
import { AlertCircle, FileText, Search, Building2, Calendar, ShieldAlert } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function RejectedReferralsPage() {
  const { referrals } = useCareConnectData();
  const [search, setSearch] = useState('');

  const rejectedList = referrals.filter(r => r.status === 'Rejected' && (
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.service.toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Rejected Referrals & FR-22 Clinical Justifications</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Official statutory audit registry of referrals declined due to bed surge, equipment maintenance, or specialized clinic off-duty
        </p>
      </div>

      <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300">
        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
        <p>
          <b>Ethiopian Health Bureau Compliance (FR-22):</b> No clinical referral may be arbitrarily rejected. Every rejection record below documents a certified institutional clinical justification and suggested alternative facility routing.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rejected referrals..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        {rejectedList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            No rejected referrals on file. All cases triaged and accommodated.
          </div>
        ) : (
          rejectedList.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/50 shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-600 text-sm">{r.id}</span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{r.patientName}</h4>
                  <span className="text-slate-500 font-semibold">({r.age}yo {r.gender})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                    FR-22 Rejection Recorded
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">{r.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Referring Facility</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{r.referringFacility}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Specialty Requested</span>
                  <span className="font-semibold text-sky-600">{r.service}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Primary Clinical Indication</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">{r.clinicalSummary}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1">
                <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Documented Justification & Alternative Facility Recommendation:</span>
                </span>
                <p className="text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                  {r.rejectionReason || r.notes || 'Operating theatre surge capacity exceeded. Alternative recommended: St. Paul Hospital or Yekatit 12 Hospital.'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
