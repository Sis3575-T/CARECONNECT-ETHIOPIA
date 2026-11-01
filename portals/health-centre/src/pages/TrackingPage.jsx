import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Clock,
  CheckCircle2,
  Truck,
  Building2,
  User,
  AlertCircle,
  Search,
  Phone,
  Calendar,
  Ambulance,
  ChevronRight
} from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function TrackingPage() {
  const { referrals, transports } = useCareConnectData();
  const [selectedId, setSelectedId] = useState(referrals[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (referrals.length > 0 && !selectedId) {
      setSelectedId(referrals[0].id);
    }
  }, [referrals, selectedId]);

  const selectedRef = referrals.find(r => r.id === selectedId) || referrals[0];

  const linkedTransport = selectedRef
    ? transports.find(t => t.referralId === selectedRef.id)
    : null;

  const filteredReferrals = referrals.filter(r =>
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Referral Lifecycle & Progress Tracking</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Live inter-facility audit trail with hospital acknowledgement and ambulance transit telemetry
        </p>
      </div>

      {/* Referral Selector Cards */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-slate-800 dark:text-slate-200">Select Referral to Track:</span>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID or patient..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filteredReferrals.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`p-3 rounded-xl border text-left shrink-0 min-w-[200px] transition-all cursor-pointer ${
                selectedRef && selectedRef.id === r.id
                  ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-1 ring-sky-500'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-[10px]">{r.id}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  r.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                  r.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                  r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {r.status}
                </span>
              </div>
              <h5 className="font-bold text-slate-900 dark:text-white truncate">{r.patientName}</h5>
              <p className="text-[10px] text-slate-500 truncate">{r.receivingFacility}</p>
            </button>
          ))}
        </div>
      </div>

      {selectedRef && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Timeline (Left 2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6 text-xs">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{selectedRef.id}</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedRef.patientName}</h3>
                <span className="text-slate-500">{selectedRef.age}yo {selectedRef.gender} • {selectedRef.service}</span>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedRef.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                  selectedRef.status === 'In Transit' ? 'bg-violet-100 text-violet-700' :
                  selectedRef.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  ● {selectedRef.status}
                </span>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">{selectedRef.date}</p>
              </div>
            </div>

            {/* Visual Timeline Stepper */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-sky-600" />
                <span>End-to-End Referral Progression</span>
              </h4>

              <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700">
                {selectedRef.timeline && selectedRef.timeline.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3">
                    <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                      step.done
                        ? 'bg-sky-500 border-white text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent'
                    }`}>
                      {step.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>

                    <div className={`p-3.5 rounded-xl border flex-1 ${
                      step.done
                        ? 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/60'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{step.step}</span>
                        <span className="font-mono text-[10px] text-slate-400">{step.timestamp}</span>
                      </div>
                      {step.by && (
                        <p className="text-[11px] text-slate-500 mt-0.5">Recorded by: {step.by}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white block">Transmitted Clinical Summary</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedRef.clinicalSummary}
              </p>
            </div>
          </div>

          {/* Right Column: Transport & Receiving Hospital info */}
          <div className="space-y-4">
            {/* Receiving Facility Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Receiving Facility</span>
              </h4>
              <p className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedRef.receivingFacility}</p>
              <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                <div>Requested Department: <b className="text-sky-600">{selectedRef.service}</b></div>
                <div>Urgency Priority: <b>{selectedRef.urgency}</b></div>
                <div>AI Completeness: <b>{selectedRef.completeness}</b></div>
              </div>
            </div>

            {/* Ambulance Transport Telemetry Card */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-violet-600" />
                <span>Ambulance Transport Status</span>
              </h4>

              {linkedTransport ? (
                <div className="space-y-2 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Vehicle Assigned:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{linkedTransport.assignedVehicle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Driver:</span>
                    <span className="font-bold">{linkedTransport.driver}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Driver Phone:</span>
                    <span className="font-mono font-bold text-violet-600">{linkedTransport.driverPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transit Corridor:</span>
                    <span className="font-semibold">{linkedTransport.routeSector}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Travel:</span>
                    <span className="font-bold">{linkedTransport.etaMinutes ? `${linkedTransport.etaMinutes} mins remaining` : 'Pending departure'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/60 text-[11px] text-violet-800 dark:text-violet-300 font-medium">
                    Status: <b>{linkedTransport.status}</b> ({linkedTransport.vehicleType})
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 text-center">
                  {selectedRef.transportRequired
                    ? 'Awaiting assignment by Central Dispatch Coordinator'
                    : 'No ambulance transportation requested for this elective referral'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
