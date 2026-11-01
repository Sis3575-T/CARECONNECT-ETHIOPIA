import React, { useState } from 'react';
import {
  Car,
  Truck,
  Phone,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Search,
  PlusCircle,
  X,
  Send,
  Calendar,
  Check
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function TransportRequestsPage() {
  const { transports, resources, assignTransport, updateTransportStatus } = useCareConnectData();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Form for vehicle assignment
  const [selectedVehicle, setSelectedVehicle] = useState('AMB-AA-012');
  const [driverName, setDriverName] = useState('Kassahun Tadesse');
  const [driverPhone, setDriverPhone] = useState('+251 91 190 2341');
  const [departureTime, setDepartureTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [etaMinutes, setEtaMinutes] = useState(25);
  const [notes, setNotes] = useState('Patient requires supplemental O2 at 4L/min.');

  const availableResources = resources.filter(r => r.status === 'Available' || r.status === 'Stationary');

  const filtered = transports.filter(t => {
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesSearch =
      t.patientName.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      (t.origin && t.origin.toLowerCase().includes(search.toLowerCase())) ||
      (t.destination && t.destination.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleOpenAssign = (transport) => {
    setSelectedTransport(transport);
    setIsAssignModalOpen(true);
  };

  const handleConfirmAssignment = async (e) => {
    e.preventDefault();
    if (!selectedTransport) return;

    await assignTransport({
      transportId: selectedTransport.id,
      referralId: selectedTransport.referralId,
      assignedVehicle: selectedVehicle,
      driver: driverName,
      driverPhone: driverPhone,
      scheduledDeparture: departureTime,
      etaMinutes,
      notes,
      coordinator: 'Central Medical Dispatcher'
    });

    setIsAssignModalOpen(false);
    setSelectedTransport(null);
  };

  const handleQuickStatus = async (id, newStatus) => {
    await updateTransportStatus(id, newStatus, {
      speedKmH: newStatus === 'In Transit' ? 52 : 0,
      etaMinutes: newStatus === 'Arrived' ? 0 : 15
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Patient Transport Coordination Queue</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Dispatch emergency ambulances, assign drivers, and monitor inter-facility transit telemetry across Addis Ababa corridors
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transport requests by patient, request ID, origin, destination..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Pending Assignment', 'Dispatched', 'In Transit', 'Arrived', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#6d28d9] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Transfer Route</th>
                <th className="py-3 px-4">Assigned Unit</th>
                <th className="py-3 px-4">Driver & Cellular</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Transport Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transport requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                    <td className="py-3.5 px-4 font-mono font-bold text-violet-600 dark:text-violet-400">{t.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {t.patientName}
                      <span className="text-[10px] text-slate-400 block font-normal">{t.age}yo • {t.referralId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <span className="block truncate max-w-[160px]">{t.origin}</span>
                      <span className="text-violet-600 font-semibold block truncate max-w-[160px]">&rarr; {t.destination}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {t.assignedVehicle || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold block text-slate-800 dark:text-white">{t.driver || 'Pending'}</span>
                      <span className="text-[10px] font-mono text-slate-400">{t.driverPhone || '-'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.urgency === 'Emergency' ? 'bg-rose-100 text-rose-700' :
                        t.urgency === 'Urgent' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {t.urgency}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'Completed' || t.status === 'Arrived'
                          ? 'bg-emerald-100 text-emerald-700'
                          : t.status === 'In Transit'
                          ? 'bg-violet-100 text-violet-700'
                          : t.status === 'Dispatched'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      {t.status === 'Pending Assignment' ? (
                        <button
                          onClick={() => handleOpenAssign(t)}
                          className="px-3 py-1.5 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded-xl font-bold shadow-xs cursor-pointer"
                        >
                          Assign Unit
                        </button>
                      ) : t.status === 'Dispatched' ? (
                        <button
                          onClick={() => handleQuickStatus(t.id, 'In Transit')}
                          className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold cursor-pointer"
                        >
                          Mark In-Transit
                        </button>
                      ) : t.status === 'In Transit' ? (
                        <button
                          onClick={() => handleQuickStatus(t.id, 'Arrived')}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                        >
                          Confirm Arrival
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold">✓ Complete</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assignment Modal */}
      {isAssignModalOpen && selectedTransport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="font-mono text-violet-600 font-bold text-[10px]">{selectedTransport.id}</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Assign Ambulance Resource</h3>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-3.5">
              <div className="p-3 bg-violet-50 dark:bg-violet-950/40 rounded-xl border border-violet-100 dark:border-violet-900 text-slate-700 dark:text-slate-300 space-y-1">
                <div>Patient: <b>{selectedTransport.patientName}</b> ({selectedTransport.urgency})</div>
                <div>Route: <b>{selectedTransport.origin} &rarr; {selectedTransport.destination}</b></div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Select Available Fleet Unit *</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                >
                  <option value="AMB-AA-012">AMB-AA-012 — Advanced Life Support (ALS) • Kazanchis Base</option>
                  <option value="AMB-AA-004">AMB-AA-004 — Basic Life Support (BLS) • Bole Base</option>
                  <option value="AMB-AA-009">AMB-AA-009 — Basic Life Support (BLS) • Lideta Base</option>
                  <option value="AMB-NICU-001">AMB-NICU-001 — Neonatal ICU Van • St. Paul Station</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Assigned Driver</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Driver Phone</label>
                  <input
                    type="text"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Scheduled Departure</label>
                  <input
                    type="text"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Estimated Travel (Mins)</label>
                  <input
                    type="number"
                    value={etaMinutes}
                    onChange={(e) => setEtaMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Transit Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paramedic escort onboard"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Dispatch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
