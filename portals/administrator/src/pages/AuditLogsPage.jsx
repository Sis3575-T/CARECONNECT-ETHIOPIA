import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Search,
  Shield,
  Clock,
  Download,
  Filter,
  CheckCircle2,
  User,
  Building2,
  Cpu,
  Eye,
  X
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function AuditLogsPage() {
  const { auditLogs } = useCareConnectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('All');
  const [selectedLog, setSelectedLog] = useState(null);

  // Filtered
  const filtered = useMemo(() => {
    return auditLogs.filter(l => {
      const matchSearch =
        l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.entity && l.entity.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.details && l.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchAction =
        selectedAction === 'All' ||
        (selectedAction === 'Referral' && l.action.includes('REFERRAL')) ||
        (selectedAction === 'User' && l.action.includes('USER')) ||
        (selectedAction === 'Facility' && (l.action.includes('FACILITY') || l.action.includes('CAPACITY'))) ||
        (selectedAction === 'AI' && l.action.includes('AI')) ||
        (selectedAction === 'Transport' && l.action.includes('TRANSPORT'));

      return matchSearch && matchAction;
    });
  }, [auditLogs, searchTerm, selectedAction]);

  const handleExportCSV = () => {
    const headers = ['Log ID', 'User', 'Role', 'Facility', 'Action', 'Entity', 'Details', 'Timestamp (UTC+3)'];
    const rows = filtered.map(l => [
      l.id,
      `"${l.user}"`,
      `"${l.role || ''}"`,
      `"${l.facility || ''}"`,
      `"${l.action}"`,
      `"${l.entity || ''}"`,
      `"${l.details || ''}"`,
      `"${l.timestamp}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careconnect_security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
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
            Security & Compliance Audit Trail (Section 9.J)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable chronological records of clinical referrals, dispatch assignments, and administrative actions
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* Compliance Box */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Cryptographically Timestamped:</span> All system events are permanently cataloged with source IP signatures, authenticated user credentials, and UTC+3 timestamps in compliance with Ethiopian Electronic Health Record Security Directives.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail by user, action, entity ID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-slate-400">Category:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
          >
            <option value="All">All Events</option>
            <option value="Referral">Referral Operations</option>
            <option value="User">User Management</option>
            <option value="Facility">Facility & Capacity</option>
            <option value="Transport">EMS Logistics</option>
            <option value="AI">AI Pipeline Changes</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-5">Log ID</th>
              <th className="py-3 px-4">Responsible User</th>
              <th className="py-3 px-4">Action Event</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Timestamp (UTC+3)</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono">
            {filtered.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                <td className="py-3.5 px-5 font-bold text-slate-400 text-xs">{l.id}</td>

                <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                  <div>
                    <span>{l.user}</span>
                    {l.role && (
                      <span className="text-[10px] text-slate-400 block font-normal">{l.role}</span>
                    )}
                  </div>
                </td>

                <td className="py-3.5 px-4 text-blue-600 dark:text-blue-400 font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-[10px]">
                    {l.action}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                  {l.entity || '—'}
                </td>

                <td className="py-3.5 px-4 text-slate-500 font-sans text-[11px]">
                  {l.timestamp}
                </td>

                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setSelectedLog(l)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="View Full Audit Record"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{selectedLog.id}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">{selectedLog.action}</h3>
              </div>
              <button onClick={() => setSelectedLog(null)}><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Responsible Actor:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.user}</span>
              </div>
              {selectedLog.role && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-slate-400">Role:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.role}</span>
                </div>
              )}
              {selectedLog.facility && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="text-slate-400">Facility:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.facility}</span>
                </div>
              )}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Target Entity:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.entity}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedLog.timestamp}</span>
              </div>
            </div>

            {selectedLog.details && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold block text-[10px] mb-1">Event Audit Description:</span>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">{selectedLog.details}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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