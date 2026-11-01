import React, { useState } from 'react';
import { Bed, CheckCircle2, Clock, Truck, UserCheck, Search, ShieldCheck } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function PatientArrivalsPage() {
  const { referrals, updateReferralStatus } = useCareConnectData();
  const [search, setSearch] = useState('');

  // Accepted, In Transit, Arrived, or Completed referrals
  const arrivalReferrals = referrals.filter(r =>
    (r.status === 'Accepted' || r.status === 'In Transit' || r.status === 'Arrived') &&
    (r.patientName.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirmArrival = async (id) => {
    await updateReferralStatus(id, 'Arrived', 'Patient admitted to Ward. Triage handoff complete.', {
      actorName: 'Triage Nurse Selamawit',
      actorRole: 'Hospital Staff',
      actorFacility: 'Tikur Anbessa Hospital'
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Patient Admissions & Arrival Progress</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Track expected patient arrivals, confirm hospital arrival, and record ward admission handoffs
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search arriving patients..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Patient Name</th>
              <th className="py-3 px-4">Referral ID</th>
              <th className="py-3 px-4">Origin Facility</th>
              <th className="py-3 px-4">Specialty Service</th>
              <th className="py-3 px-4">Transport / Arrival Status</th>
              <th className="py-3 px-4 text-right">Admission Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {arrivalReferrals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No arriving patients scheduled currently.
                </td>
              </tr>
            ) : (
              arrivalReferrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {r.patientName}
                    <span className="text-[10px] text-slate-400 block font-normal">{r.age}yo • {r.gender}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.id}</td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{r.referringFacility}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{r.service}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'Arrived' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {r.status === 'Arrived' ? '✓ Handoff Complete' : r.status === 'In Transit' ? '● En-Route to Hospital' : 'Awaiting Transport'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {r.status === 'Arrived' ? (
                      <span className="text-emerald-600 font-bold flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Admitted
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmArrival(r.id)}
                        className="px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Confirm Handoff</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
