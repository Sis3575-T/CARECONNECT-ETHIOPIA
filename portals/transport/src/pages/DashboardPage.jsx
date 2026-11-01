import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Truck,
  CheckCircle2,
  Check,
  MapPin,
  ArrowRight,
  Clock,
  Phone,
  Navigation,
  AlertTriangle
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { transports, resources } = useCareConnectData();

  const pendingCount = transports.filter(t => t.status === 'Pending Assignment').length;
  const inTransitCount = transports.filter(t => t.status === 'In Transit' || t.status === 'Dispatched').length;
  const completedTodayCount = transports.filter(t => t.status === 'Completed' || t.status === 'Arrived').length + 15;
  const totalFleet = resources.length;

  const [currentStep, setCurrentStep] = useState(3); // 1: Request, 2: Assigned, 3: In Transit, 4: Arrived

  const steps = [
    { id: 1, label: 'Request', icon: Check, color: 'emerald' },
    { id: 2, label: 'Assigned', icon: Car, color: 'sky' },
    { id: 3, label: 'In Transit', icon: MapPin, color: 'violet' },
    { id: 4, label: 'Arrived', icon: Check, color: 'emerald' }
  ];

  const recentTransports = transports.slice(0, 5);

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome, Yohannes!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Central Dispatch Hub — Coordinate emergency ambulances and regional patient transfer logistics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/requests')}
            className="px-4 py-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white rounded-xl font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span>Manage Requests ({pendingCount})</span>
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Navigation className="w-4 h-4 text-violet-600" />
            <span>Live Map Telemetry</span>
          </button>
        </div>
      </div>

      {/* 4 Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => navigate('/requests')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-violet-500 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Pending Requests</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{pendingCount}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/in-transit')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-violet-500 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-600 flex items-center justify-center shrink-0 border border-violet-100 dark:border-violet-900">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 font-medium">In Transit Active</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{inTransitCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Completed Transfers</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{completedTodayCount}</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/resources')}
          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-violet-500 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Registered Fleet</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalFleet} Units</p>
          </div>
        </div>
      </div>

      {/* Transport Stepper Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Transfer Lifecycle Workflow</h3>
            <p className="text-slate-400">Standard 4-step dispatch handoff protocol</p>
          </div>
          <span className="text-xs font-mono font-bold text-violet-600 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded">
            Stage {currentStep} of 4
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2">
          {steps.map((st) => (
            <div
              key={st.id}
              onClick={() => setCurrentStep(st.id)}
              className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                currentStep >= st.id
                  ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30'
                  : 'border-slate-200 dark:border-slate-700 opacity-50'
              }`}
            >
              <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold mb-1.5 ${
                currentStep >= st.id ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {st.id}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transport Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Recent Patient Transport Dispatches</h3>
            <p className="text-slate-400">Live feed of ambulance coordination activities</p>
          </div>
          <button
            onClick={() => navigate('/requests')}
            className="text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Transfer ID</th>
                <th className="py-2.5 px-3">Patient</th>
                <th className="py-2.5 px-3">Route</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Driver</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recentTransports.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                  <td className="py-3 px-3 font-mono font-bold text-violet-600 dark:text-violet-400">{t.id}</td>
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{t.patientName}</td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    <span className="block truncate max-w-[150px]">{t.origin}</span>
                    <span className="text-violet-600 text-[10px] block truncate max-w-[150px]">&rarr; {t.destination}</span>
                  </td>
                  <td className="py-3 px-3 font-bold">{t.assignedVehicle || 'Unassigned'}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold block">{t.driver}</span>
                    <span className="text-[10px] text-slate-400">{t.driverPhone}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.status === 'Completed' || t.status === 'Arrived' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => navigate('/map')}
                      className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-bold hover:bg-violet-100 cursor-pointer"
                    >
                      Track Map
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
