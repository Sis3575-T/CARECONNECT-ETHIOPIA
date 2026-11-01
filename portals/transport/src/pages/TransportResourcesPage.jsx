import React, { useState } from 'react';
import { Truck, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Plus, X, Phone, Fuel, Wrench, Check } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function TransportResourcesPage() {
  const { resources, createResource, updateResource } = useCareConnectData();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newResource, setNewResource] = useState({
    identifier: 'AMB-AA-',
    name: '',
    type: 'Basic Life Support (BLS)',
    baseFacility: 'Addis Ababa Central Station',
    assignedDriver: '',
    driverPhone: '+251 9'
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newResource.name || !newResource.identifier) return;

    await createResource({
      ...newResource,
      status: 'Available',
      equipment: ['Stretcher', 'Oxygen 1x40L', 'First Aid Kit']
    });

    setIsAddOpen(false);
    setNewResource({
      identifier: 'AMB-AA-',
      name: '',
      type: 'Basic Life Support (BLS)',
      baseFacility: 'Addis Ababa Central Station',
      assignedDriver: '',
      driverPhone: '+251 9'
    });
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus =
      currentStatus === 'Available' ? 'Dispatched' :
      currentStatus === 'Dispatched' ? 'Under Maintenance' : 'Available';

    await updateResource(id, { status: nextStatus });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ambulance Fleet & Transport Resources</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Emergency fleet registry, vehicle status, and driver allocations across regional stations ({resources.length} Units)
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded-xl font-bold shadow-xs flex items-center gap-2 cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Register Ambulance Unit</span>
        </button>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map((amb) => (
          <div
            key={amb.id}
            className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400 font-bold">{amb.identifier}</span>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{amb.name}</h4>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  amb.status === 'Available'
                    ? 'bg-emerald-100 text-emerald-700'
                    : amb.status === 'In Transit' || amb.status === 'Dispatched'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {amb.status}
                </span>
              </div>

              <p className="text-slate-500 font-medium mt-1">{amb.type}</p>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Station Depot:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{amb.baseFacility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Driver:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{amb.assignedDriver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Driver Cellular:</span>
                  <span className="font-mono text-violet-600 font-bold">{amb.driverPhone || '-'}</span>
                </div>
                {amb.fuelLevel && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5" /> Fuel Level:
                    </span>
                    <span className="font-bold text-emerald-600">{amb.fuelLevel}</span>
                  </div>
                )}
              </div>

              {amb.equipment && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {amb.equipment.map((eq, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {eq}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">Last Serviced: {amb.lastServiceDate || 'Recent'}</span>
              <button
                onClick={() => handleToggleStatus(amb.id, amb.status)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
              >
                Toggle Status
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Resource Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Register Ambulance Fleet Unit</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Plate Identifier *</label>
                <input
                  type="text"
                  required
                  value={newResource.identifier}
                  onChange={(e) => setNewResource({ ...newResource, identifier: e.target.value })}
                  placeholder="e.g. AMB-AA-031"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Unit Common Name *</label>
                <input
                  type="text"
                  required
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  placeholder="e.g. Bole Emergency Rapid Unit 03"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Vehicle Type</label>
                <select
                  value={newResource.type}
                  onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Basic Life Support (BLS)">Basic Life Support (BLS)</option>
                  <option value="Advanced Life Support (ALS)">Advanced Life Support (ALS)</option>
                  <option value="Neonatal Intensive Care (NICU)">Neonatal Intensive Care (NICU)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Base Depot / Station</label>
                <input
                  type="text"
                  value={newResource.baseFacility}
                  onChange={(e) => setNewResource({ ...newResource, baseFacility: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Assigned Driver</label>
                  <input
                    type="text"
                    value={newResource.assignedDriver}
                    onChange={(e) => setNewResource({ ...newResource, assignedDriver: e.target.value })}
                    placeholder="e.g. Abebe Bekele"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Driver Phone</label>
                  <input
                    type="text"
                    value={newResource.driverPhone}
                    onChange={(e) => setNewResource({ ...newResource, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Save Ambulance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
