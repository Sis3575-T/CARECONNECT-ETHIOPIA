import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, Eye, AlertCircle, X, Check, BedDouble } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function PendingReferralsPage() {
  const { referrals, updateReferralStatus } = useCareConnectData();
  const [selectedRef, setSelectedRef] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Operating theatre surge capacity exceeded. Alternative recommended: St. Paul Hospital.');
  const [search, setSearch] = useState('');

  const pendingList = referrals.filter(r => r.status === 'Pending' && (
    r.patientName.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    r.service.toLowerCase().includes(search.toLowerCase())
  ));

  const handleAcknowledge = async (id) => {
    await updateReferralStatus(id, 'Acknowledged', 'Referral acknowledged by Triage Officer', {
      actorName: 'Dr. Fitsum Tadesse',
      actorRole: 'Hospital Staff',
      actorFacility: 'Tikur Anbessa Hospital'
    });
  };

  const handleAccept = async (id) => {
    await updateReferralStatus(id, 'Accepted', 'Bed allocated in Cardiology Ward', {
      actorName: 'Dr. Fitsum Tadesse',
      actorRole: 'Hospital Staff',
      actorFacility: 'Tikur Anbessa Hospital'
    });
    setSelectedRef(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('A clinical or capacity reason is required to reject a referral (FR-22).');
      return;
    }
    await updateReferralStatus(selectedRef.id, 'Rejected', rejectReason, {
      rejectionReason: rejectReason,
      actorName: 'Dr. Fitsum Tadesse',
      actorRole: 'Hospital Staff',
      actorFacility: 'Tikur Anbessa Hospital'
    });
    setRejectModalOpen(false);
    setSelectedRef(null);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pending Referral Acknowledgements & Triage</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Referrals received from primary health centres awaiting hospital triage review ({pendingList.length} Pending)
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pending referrals by patient, ID, or specialty..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Referral ID</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Referring Facility</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {pendingList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No pending referrals awaiting acknowledgement. All incoming cases are triaged.
                  </td>
                </tr>
              ) : (
                pendingList.map((r) => (
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
                        r.urgency === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                        r.urgency === 'Urgent' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedRef(r)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                        <button
                          onClick={() => handleAcknowledge(r.id)}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Acknowledge</span>
                        </button>
                        <button
                          onClick={() => handleAccept(r.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
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

      {/* Review Modal */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="font-mono text-emerald-600 font-bold text-[10px]">{selectedRef.id}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{selectedRef.patientName}</h3>
              </div>
              <button onClick={() => setSelectedRef(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <div>Origin: <b>{selectedRef.referringFacility}</b></div>
                <div>Doctor: <b>{selectedRef.referringDoctor}</b></div>
                <div>Service: <b>{selectedRef.service}</b></div>
                <div>Priority: <b>{selectedRef.urgency}</b></div>
              </div>

              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-1">Clinical Indications:</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedRef.clinicalSummary}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setRejectModalOpen(true)}
                className="px-3.5 py-2 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100"
              >
                Reject with FR-22 Justification
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcknowledge(selectedRef.id)}
                  className="px-3.5 py-2 bg-amber-500 text-white font-bold rounded-xl"
                >
                  Acknowledge
                </button>
                <button
                  onClick={() => handleAccept(selectedRef.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Accept & Allocate Bed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FR-22 Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              <span>Mandatory Rejection Justification (FR-22)</span>
            </div>
            <p className="text-slate-500 text-xs">
              Ethiopian national regulations require a verified clinical or bed capacity justification and recommended alternative facility.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 border rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 bg-rose-600 text-white font-bold rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
