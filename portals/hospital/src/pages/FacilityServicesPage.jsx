import React, { useState } from 'react';
import { Layers, Stethoscope, CheckCircle2, AlertCircle, PlusCircle, Edit2, ShieldCheck, Activity } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function FacilityServicesPage() {
  const { facilities } = useCareConnectData();
  const currentHospital = facilities.find(f => f.name.includes('Tikur')) || facilities[0];

  const [services, setServices] = useState([
    { id: 'srv-01', name: 'Cardiology & Cardiac Catheterization', status: 'Operational', dutyDoctor: 'Dr. Daniel Worku', beds: 45, freeBeds: 6, onCall: '24/7 Active' },
    { id: 'srv-02', name: 'Emergency Trauma & Orthopedics', status: 'High Surge', dutyDoctor: 'Dr. Fitsum Tadesse', beds: 60, freeBeds: 2, onCall: '24/7 Active' },
    { id: 'srv-03', name: 'Intensive Care Unit (ICU)', status: 'Critical', dutyDoctor: 'Dr. Helina Getu', beds: 24, freeBeds: 3, onCall: '24/7 Active' },
    { id: 'srv-04', name: 'Obstetrics & High-Risk Maternal Care', status: 'Operational', dutyDoctor: 'Dr. Berhanu Mengistu', beds: 50, freeBeds: 12, onCall: '24/7 Active' },
    { id: 'srv-05', name: 'Neurosurgery & Stroke Unit', status: 'Operational', dutyDoctor: 'Dr. Dawit Zewdu', beds: 30, freeBeds: 5, onCall: 'On-Call' },
    { id: 'srv-06', name: 'Pediatrics & Neonatal ICU (NICU)', status: 'Operational', dutyDoctor: 'Dr. Selamawit Alemu', beds: 40, freeBeds: 8, onCall: '24/7 Active' },
    { id: 'srv-07', name: 'Nephrology & Hemodialysis', status: 'Operational', dutyDoctor: 'Dr. Yohannes Kassa', beds: 20, freeBeds: 4, onCall: 'Scheduled' }
  ]);

  const toggleStatus = (id) => {
    setServices(services.map(s => {
      if (s.id === id) {
        const nextStatus = s.status === 'Operational' ? 'High Surge' : s.status === 'High Surge' ? 'Critical' : 'Operational';
        return { ...s, status: nextStatus };
      }
      return s;
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hospital Clinical Services & Department Roster</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage specialty service operational status, on-call specialist physicians, and department bed allocation
          </p>
        </div>
      </div>

      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">{currentHospital.name}</h4>
          <p className="text-emerald-700 dark:text-emerald-400 text-xs">
            Comprehensive Specialized Tertiary Institution • Emergency Reception Desk Active
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs">
          7 Departments Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</h4>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                s.status === 'Operational' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                s.status === 'High Surge' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}>
                {s.status}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Attending Specialist:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{s.dutyDoctor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Department Beds:</span>
                <span className="font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">{s.freeBeds} free</span> / {s.beds} total
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duty Coverage:</span>
                <span className="font-medium text-sky-600">{s.onCall}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-[10px] text-slate-400 font-mono">{s.id}</span>
              <button
                onClick={() => toggleStatus(s.id)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
              >
                Toggle Status
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
