import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  PlusCircle,
  FileText,
  Building2,
  X,
  AlertCircle
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AllReferralsPage() {
  const navigate = useNavigate();
  const { referrals } = useCareConnectData();

  const [filterStatus, setFilterStatus] = useState('All');
  const [filterUrgency, setFilterUrgency] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedRef, setSelectedRef] = useState(null);

  const filtered = referrals.filter(r => {
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    const matchesUrgency = filterUrgency === 'All' || r.urgency === filterUrgency;
    const matchesSearch =
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.service.toLowerCase().includes(search.toLowerCase()) ||
      (r.receivingFacility && r.receivingFacility.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesUrgency && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ['Referral ID', 'Patient Name', 'Age', 'Gender', 'Service', 'Receiving Hospital', 'Urgency', 'Status', 'Date'];
    const rows = filtered.map(r => [
      r.id,
      `"${r.patientName}"`,
      r.age,
      r.gender,
      `"${r.service}"`,
      `"${r.receivingFacility}"`,
      r.urgency,
      r.status,
      r.date
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_referrals_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">All Outgoing Referrals</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official ledger of digital referrals transmitted from Yeka Health Centre ({referrals.length} Total)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => navigate('/create-referral')}
            className="px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Referral</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, patient, hospital, or specialty..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Pending', 'Accepted', 'In Transit', 'Arrived', 'Completed', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#0284c7] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}

          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200"
          >
            <option value="All">All Urgencies</option>
            <option value="Emergency">Emergency</option>
            <option value="Urgent">Urgent</option>
            <option value="Routine">Routine</option>
          </select>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Referral ID</th>
                <th className="py-3 px-4">Patient Demographics</th>
                <th className="py-3 px-4">Service & Clinical Reason</th>
                <th className="py-3 px-4">Receiving Hospital</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No referrals match your current search and filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {r.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{r.patientName}</span>
                      <span className="text-[10px] text-slate-500">{r.age} yrs • {r.gender} • {r.patientId}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">{r.service}</span>
                      <span className="text-[11px] text-slate-500 truncate block">{r.clinicalSummary}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {r.receivingFacility}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.urgency === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                        r.urgency === 'Urgent' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                        r.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                        r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                        r.status === 'Completed' || r.status === 'Arrived' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {r.date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedRef(r)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 hover:text-sky-600 rounded-lg font-bold flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Referral Detail Modal */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 block">{selectedRef.id}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{selectedRef.patientName}</h3>
              </div>
              <button onClick={() => setSelectedRef(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Receiving Hospital</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedRef.receivingFacility}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Requested Specialty</span>
                <span className="font-bold text-sky-600">{selectedRef.service}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Status</span>
                <span className="font-bold">{selectedRef.status}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Transport Mode</span>
                <span className="font-bold">{selectedRef.transportRequired ? 'Ambulance Required' : 'Self Transport'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Clinical Summary</span>
              <p className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedRef.clinicalSummary}
              </p>
            </div>

            {selectedRef.rejectionReason && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1">
                <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Mandatory Rejection Justification (FR-22)</span>
                </span>
                <p className="text-rose-800 dark:text-rose-300 text-[11px]">
                  {selectedRef.rejectionReason}
                </p>
              </div>
            )}

            {selectedRef.timeline && selectedRef.timeline.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white block">Status Progression Timeline</span>
                <div className="space-y-2">
                  {selectedRef.timeline.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                        item.done ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`} />
                      <span className={`font-semibold flex-1 ${item.done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {item.step} {item.by && <span className="text-[10px] text-slate-400 font-normal">({item.by})</span>}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  setSelectedRef(null);
                  navigate('/tracking');
                }}
                className="text-sky-600 dark:text-sky-400 font-bold hover:underline"
              >
                Open Full Tracking Page →
              </button>
              <button
                onClick={() => setSelectedRef(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
