import React, { useState, useEffect } from 'react';
import { Layers, BedDouble, Activity, Clock, Save, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function CapacityManagementPage() {
  const { facilities, updateFacilityCapacity } = useCareConnectData();
  const currentHospital = facilities.find(f => f.name.includes('Tikur')) || facilities[0];

  const [totalBeds, setTotalBeds] = useState(currentHospital?.beds || 800);
  const [availableBeds, setAvailableBeds] = useState(currentHospital?.availableBeds || 42);
  const [icuBedsFree, setIcuBedsFree] = useState(currentHospital?.availableIcuBeds || 3);
  const [ventilatorsFree, setVentilatorsFree] = useState(currentHospital?.availableVentilators || 2);
  const [oxygenLevel, setOxygenLevel] = useState(currentHospital?.oxygenLevel || '94% Adequate');
  const [workloadLevel, setWorkloadLevel] = useState(currentHospital?.workloadLevel || 'High (88%)');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentHospital) {
      setTotalBeds(currentHospital.beds);
      setAvailableBeds(currentHospital.availableBeds);
      setIcuBedsFree(currentHospital.availableIcuBeds || 3);
      setVentilatorsFree(currentHospital.availableVentilators || 2);
      setOxygenLevel(currentHospital.oxygenLevel || '94% Adequate');
      setWorkloadLevel(currentHospital.workloadLevel || 'High (88%)');
    }
  }, [currentHospital]);

  const handleSave = async (e) => {
    e.preventDefault();
    await updateFacilityCapacity(currentHospital.id, {
      beds: totalBeds,
      availableBeds,
      availableIcuBeds: icuBedsFree,
      availableVentilators: ventilatorsFree,
      oxygenLevel,
      workloadLevel
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Facility Capacity & Live Telemetry Reporting</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Update reported bed capacity and emergency resource availability for {currentHospital?.name}
        </p>
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 leading-relaxed">
        <span className="font-bold">Administrative Rule (FR-09 & Section 13):</span> Reported hospital capacity information includes a live timestamp. Updating these metrics instantly broadcasts new availability to Health Centres and AI matching algorithms across Ethiopia.
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <BedDouble className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live Hospital Bed & Critical Care Metrics</h3>
          </div>
          <span className="text-[11px] text-slate-400">Last reported: {currentHospital?.lastCapacityUpdate || 'Just now'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Total Approved Beds</label>
            <input
              type="number"
              value={totalBeds}
              onChange={(e) => setTotalBeds(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Currently Available Beds *</label>
            <input
              type="number"
              value={availableBeds}
              onChange={(e) => setAvailableBeds(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-black text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">ICU Beds Free *</label>
            <input
              type="number"
              value={icuBedsFree}
              onChange={(e) => setIcuBedsFree(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-black text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Free Ventilators</label>
            <input
              type="number"
              value={ventilatorsFree}
              onChange={(e) => setVentilatorsFree(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Oxygen Reserves</label>
            <input
              type="text"
              value={oxygenLevel}
              onChange={(e) => setOxygenLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Reported Workload</label>
            <select
              value={workloadLevel}
              onChange={(e) => setWorkloadLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
            >
              <option value="Normal (50%)">Normal (50%)</option>
              <option value="Moderate (74%)">Moderate (74%)</option>
              <option value="High (88%)">High (88%)</option>
              <option value="Critical (95%)">Critical (95%)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          {savedSuccess && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4" /> Capacity broadcast updated and saved to persistent database!
            </span>
          )}
          <button
            type="submit"
            className="ml-auto px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Publish Capacity Update</span>
          </button>
        </div>
      </form>
    </div>
  );
}
