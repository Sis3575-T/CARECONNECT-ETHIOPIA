import React, { useState, useMemo } from 'react';
import {
  Activity,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  BedDouble,
  Wind,
  Droplets,
  HeartPulse,
  TrendingUp,
  MapPin
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function CapacityMonitoringPage() {
  const { facilities, updateFacilityCapacity } = useCareConnectData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [selectedWorkload, setSelectedWorkload] = useState('All');
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    availableBeds: '',
    availableIcuBeds: '',
    availableVentilators: '',
    oxygenLevel: '',
    workloadLevel: ''
  });

  // Calculate aggregated stats
  const aggregates = useMemo(() => {
    let totalBeds = 0;
    let availableBeds = 0;
    let totalIcu = 0;
    let availableIcu = 0;
    let totalVents = 0;
    let availableVents = 0;
    let criticalCount = 0;

    facilities.forEach(f => {
      const b = Number(f.beds) || 0;
      const ab = Number(f.availableBeds) || 0;
      const icu = Number(f.icuBeds) || 0;
      const aicu = Number(f.availableIcuBeds) || 0;
      const vent = Number(f.ventilators) || 0;
      const avent = Number(f.availableVentilators) || 0;

      totalBeds += b;
      availableBeds += ab;
      totalIcu += icu;
      availableIcu += aicu;
      totalVents += vent;
      availableVents += avent;

      if (b > 0 && (ab / b) < 0.15) {
        criticalCount++;
      }
    });

    const occupiedBeds = totalBeds - availableBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalBeds,
      availableBeds,
      occupiedBeds,
      occupancyRate,
      totalIcu,
      availableIcu,
      totalVents,
      availableVents,
      criticalCount
    };
  }, [facilities]);

  // Regions list
  const regions = useMemo(() => {
    const set = new Set(facilities.map(f => f.region).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [facilities]);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.zone.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRegion = selectedRegion === 'All' || f.region === selectedRegion;
      const matchWorkload = selectedWorkload === 'All' || f.workloadLevel === selectedWorkload;
      return matchSearch && matchRegion && matchWorkload;
    });
  }, [facilities, searchTerm, selectedRegion, selectedWorkload]);

  const handleOpenEdit = (facility) => {
    setSelectedFacility(facility);
    setEditFormData({
      availableBeds: facility.availableBeds,
      availableIcuBeds: facility.availableIcuBeds,
      availableVentilators: facility.availableVentilators,
      oxygenLevel: facility.oxygenLevel,
      workloadLevel: facility.workloadLevel
    });
    setIsEditModalOpen(true);
  };

  const handleSaveCapacity = async (e) => {
    e.preventDefault();
    if (!selectedFacility) return;

    await updateFacilityCapacity(selectedFacility.id, {
      availableBeds: Number(editFormData.availableBeds),
      availableIcuBeds: Number(editFormData.availableIcuBeds),
      availableVentilators: Number(editFormData.availableVentilators),
      oxygenLevel: editFormData.oxygenLevel,
      workloadLevel: editFormData.workloadLevel
    });

    setIsEditModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            System-Wide Hospital Capacity Surveillance (Section 9.F)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-facility bed utilization, ICU readiness, oxygen reserves, and critical surge monitoring
          </p>
        </div>
      </div>

      {/* Surge Alert Banner if any critical */}
      {aggregates.criticalCount > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">Critical Surge Warning</span>
              <span className="text-xs text-amber-800 dark:text-amber-300">
                {aggregates.criticalCount} referral hospitals are operating with &lt; 15% available bed capacity. Prioritize load balancing and alternate facility routing.
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedWorkload('High Demand')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0"
          >
            View Critical Facilities
          </button>
        </div>
      )}

      {/* 4 Top Aggregated Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">System Bed Occupancy</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{aggregates.occupancyRate}%</span>
              <span className="text-xs text-slate-500 font-mono">({aggregates.availableBeds} free)</span>
            </div>
            <div className="w-28 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${aggregates.occupancyRate > 85 ? 'bg-rose-500' : aggregates.occupancyRate > 70 ? 'bg-amber-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(aggregates.occupancyRate, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Available ICU Beds</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{aggregates.availableIcu}</span>
              <span className="text-xs text-slate-500 font-mono">/ {aggregates.totalIcu} Total</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">High-acuity readiness</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900">
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Active Ventilators</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{aggregates.availableVents}</span>
              <span className="text-xs text-slate-500 font-mono">/ {aggregates.totalVents} Available</span>
            </div>
            <span className="text-[10px] text-purple-600 font-bold block mt-1">Respiratory emergency</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 font-semibold block text-[11px]">Reporting Facilities</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{facilities.length}</span>
              <span className="text-xs text-slate-500">Live Network</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">100% Up to Date</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facility by name, region, or zone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Workload:</span>
            <select
              value={selectedWorkload}
              onChange={(e) => setSelectedWorkload(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
            >
              <option value="All">All Workloads</option>
              <option value="Normal">Normal</option>
              <option value="Moderate">Moderate</option>
              <option value="High Demand">High Demand</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facilities Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 uppercase text-[10px] font-bold">
              <tr>
                <th className="py-3 px-5">Facility Details</th>
                <th className="py-3 px-4">Bed Utilization</th>
                <th className="py-3 px-4 text-center">ICU Capacity</th>
                <th className="py-3 px-4 text-center">Ventilators</th>
                <th className="py-3 px-4">Oxygen Reserve</th>
                <th className="py-3 px-4">Workload Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredFacilities.map((f) => {
                const total = Number(f.beds) || 1;
                const free = Number(f.availableBeds) || 0;
                const occPercent = Math.round(((total - free) / total) * 100);
                const isSurge = free / total < 0.15;

                return (
                  <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{f.name}</span>
                          {isSurge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Surge
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{f.woreda}, {f.zone}, {f.region}</span>
                          <span>•</span>
                          <span className="font-semibold">{f.type}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 min-w-[170px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {free} free / {total} total
                          </span>
                          <span className="font-mono text-slate-500 font-bold">{occPercent}% occupied</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              occPercent > 85 ? 'bg-rose-500' : occPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(occPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {f.availableIcuBeds || 0} / {f.icuBeds || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {f.availableVentilators || 0} / {f.ventilators || 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {f.oxygenLevel || 'Adequate'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        f.workloadLevel === 'Critical'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : f.workloadLevel === 'High Demand'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {f.workloadLevel || 'Normal'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(f)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg font-bold text-slate-700 dark:text-slate-200 text-xs transition-colors"
                      >
                        Adjust Capacity
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capacity Adjustment Modal */}
      {isEditModalOpen && selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Adjust Real-time Capacity</h3>
                <p className="text-slate-400 text-xs mt-0.5">{selectedFacility.name}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">&times;</button>
            </div>

            <form onSubmit={handleSaveCapacity} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Available Beds (Total: {selectedFacility.beds})</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedFacility.beds}
                    required
                    value={editFormData.availableBeds}
                    onChange={(e) => setEditFormData({ ...editFormData, availableBeds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Available ICU (Total: {selectedFacility.icuBeds})</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedFacility.icuBeds}
                    required
                    value={editFormData.availableIcuBeds}
                    onChange={(e) => setEditFormData({ ...editFormData, availableIcuBeds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Available Ventilators</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedFacility.ventilators || 10}
                    required
                    value={editFormData.availableVentilators}
                    onChange={(e) => setEditFormData({ ...editFormData, availableVentilators: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Workload Level</label>
                  <select
                    value={editFormData.workloadLevel}
                    onChange={(e) => setEditFormData({ ...editFormData, workloadLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High Demand">High Demand</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Oxygen Level Reserve</label>
                <select
                  value={editFormData.oxygenLevel}
                  onChange={(e) => setEditFormData({ ...editFormData, oxygenLevel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                >
                  <option value="95% Optimal">95% Optimal</option>
                  <option value="85% Adequate">85% Adequate</option>
                  <option value="60% Moderate">60% Moderate</option>
                  <option value="30% Low (Alert)">30% Low (Alert)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1e3a8a] text-white font-bold rounded-xl"
                >
                  Save Capacity Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}