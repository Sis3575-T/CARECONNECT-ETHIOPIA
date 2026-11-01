import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, BedDouble, Truck, UserCheck, MessageSquare, Search, Eye } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AcceptedReferralsPage() {
  const navigate = useNavigate();
  const { referrals, updateReferralStatus } = useCareConnectData();
  const [search, setSearch] = useState('');

  const acceptedList = referrals.filter(r => (r.status === 'Accepted' || r.status === 'In Transit' || r.status === 'Arrived') && (
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.service.toLowerCase().includes(search.toLowerCase())
  ));

  const handleMarkArrived = async (id) => {
    await updateReferralStatus(id, 'Arrived', 'Patient admitted to Ward. Triage handoff complete.', {
      actorName: 'Triage Nurse Selamawit',
      actorRole: 'Hospital Staff',
      actorFacility: 'Tikur Anbessa Hospital'
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Accepted Referrals & Expected Transfers</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Cases accepted by Tikur Anbessa Specialized Hospital awaiting arrival or currently in ward care ({acceptedList.length} Active)
          </p>
        </div>

        <button
          onClick={() => navigate('/arrivals')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <UserCheck className="w-4 h-4" />
          <span>Patient Admissions Board</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accepted cases..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Referral ID</th>
              <th className="py-3 px-4">Patient Name</th>
              <th className="py-3 px-4">Origin Centre</th>
              <th className="py-3 px-4">Specialty Service</th>
              <th className="py-3 px-4">Transit / Bed Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {acceptedList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No accepted referrals currently active.
                </td>
              </tr>
            ) : (
              acceptedList.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{r.id}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 dark:text-white block">{r.patientName}</span>
                    <span className="text-[10px] text-slate-500">{r.age}yo • {r.gender}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.referringFacility}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{r.service}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'Arrived' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {r.status} {r.assignedAmbulance ? `(${r.assignedAmbulance})` : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status !== 'Arrived' && (
                        <button
                          onClick={() => handleMarkArrived(r.id)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/feedback')}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Send Feedback</span>
                      </button>
                    </div>
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
