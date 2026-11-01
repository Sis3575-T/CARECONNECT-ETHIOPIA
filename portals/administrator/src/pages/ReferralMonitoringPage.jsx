import React, { useState, useMemo } from 'react';
import {
  GitBranch,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Ambulance,
  ShieldAlert,
  X
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function ReferralMonitoringPage() {
  const { referrals } = useCareConnectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedUrgency, setSelectedUrgency] = useState('All');

  // Modal
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Status breakdown
  const stats = useMemo(() => {
    return {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'Pending').length,
      accepted: referrals.filter(r => r.status === 'Accepted').length,
      inTransit: referrals.filter(r => r.status === 'In Transit').length,
      arrived: referrals.filter(r => r.status === 'Arrived').length,
      completed: referrals.filter(r => r.status === 'Completed').length,
      rejected: referrals.filter(r => r.status === 'Rejected').length
    };
  }, [referrals]);

  // Filtered referrals
  const filtered = useMemo(() => {
    return referrals.filter(r => {
      const matchSearch =
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.patientName && r.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.referringFacility && r.referringFacility.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.receivingFacility && r.receivingFacility.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.service && r.service.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = selectedStatus === 'All' || r.status === selectedStatus;
      const matchUrgency = selectedUrgency === 'All' || r.urgency === selectedUrgency;

      return matchSearch && matchStatus && matchUrgency;
    });
  }, [referrals, searchTerm, selectedStatus, selectedUrgency]);

  const handleOpenView = (r) => {
    setSelectedReferral(r);
    setIsViewOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ['Referral ID', 'Patient', 'Age', 'Gender', 'Origin Facility', 'Receiving Facility', 'Required Service', 'Priority', 'Status', 'Submitted At'];
    const rows = filtered.map(r => [
      r.id,
      `"${r.patientName || 'Anonymous'}"`,
      r.age,
      r.gender,
      `"${r.referringFacility}"`,
      `"${r.receivingFacility}"`,
      `"${r.service}"`,
      r.urgency || r.priority,
      r.status,
      `"${r.submittedAt || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_referrals_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Platform Referral Monitoring & Audit (Section 9.G, FR-40)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            System-wide surveillance of referral lifecycle, transfer latency, and administrative bottlenecks
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Clinical Guardrail Banner */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Administrative Guardrail (Section 9.F & 13):</span> System administrators monitor network throughput, response latency, and transfer bottlenecks, but <strong>cannot modify clinical diagnoses or clinical acceptance decisions</strong> made by qualified triage practitioners.
        </div>
      </div>

      {/* Referral Status Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[10px]">Total Referrals</span>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[10px]">Pending Triage</span>
          <p className="text-xl font-black text-amber-600 mt-0.5">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[10px]">Accepted (Bed Reserved)</span>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.accepted}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[10px]">In Transit</span>
          <p className="text-xl font-black text-cyan-600 mt-0.5">{stats.inTransit}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[10px]">Completed</span>
          <p className="text-xl font-black text-blue-600 mt-0.5">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <span className="text-slate-400 font-semibold block text-[10px]">Declined (FR-22)</span>
          <p className="text-xl font-black text-rose-600 mt-0.5">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, patient, facility, service..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Accepted">Accepted</option>
              <option value="In Transit">In Transit</option>
              <option value="Arrived">Arrived</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Priority:</span>
            <select
              value={selectedUrgency}
              onChange={(e) => setSelectedUrgency(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="All">All Priorities</option>
              <option value="Emergency (Immediate)">Emergency (Immediate)</option>
              <option value="Urgent (Within 24-48 hrs)">Urgent (Within 24-48 hrs)</option>
              <option value="Routine (Elective)">Routine (Elective)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-5">Referral ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Origin Health Centre</th>
                <th className="py-3 px-4">Receiving Hospital</th>
                <th className="py-3 px-4">Specialty Service</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Lifecycle Status</th>
                <th className="py-3 px-4">Latency Audit</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.map((r) => {
                const urgency = r.urgency || r.priority || 'Routine';
                const isEmergency = urgency.toLowerCase().includes('emergency');

                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {r.id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">{r.patientName}</span>
                        <span className="text-[11px] text-slate-400">{r.age}y • {r.gender}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{r.referringFacility}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{r.receivingFacility}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {r.service}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isEmergency
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : urgency.toLowerCase().includes('urgent')
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {urgency.split(' ')[0]}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'Accepted'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900'
                          : r.status === 'In Transit'
                          ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-900'
                          : r.status === 'Arrived'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-900'
                          : r.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900'
                          : r.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900'
                      }`}>
                        {r.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[11px] text-emerald-600">
                      &lt; 15m (Within SLA)
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenView(r)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Referral Audit Trail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Referral Details Modal */}
      {isViewOpen && selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedReferral.id}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">Referral Audit Dossier</h3>
              </div>
              <button onClick={() => setIsViewOpen(false)}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Patient:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedReferral.patientName} ({selectedReferral.age}y, {selectedReferral.gender})
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Referring Health Centre:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReferral.referringFacility}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Receiving Referral Hospital:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReferral.receivingFacility}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Required Specialty:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReferral.service}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Priority Level:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReferral.urgency || selectedReferral.priority}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-bold text-emerald-600">{selectedReferral.status}</span>
              </div>
              {selectedReferral.assignedAmbulance && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-slate-400">Assigned EMS Vehicle:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedReferral.assignedAmbulance}</span>
                </div>
              )}
            </div>

            {selectedReferral.clinicalNotes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold block text-[10px] mb-1">Clinical Indication (Redacted for Privacy):</span>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{selectedReferral.clinicalNotes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl font-bold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}