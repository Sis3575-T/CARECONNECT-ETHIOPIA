import React, { useState } from 'react';
import { Truck, MapPin, Clock, Phone, AlertTriangle, CheckCircle2, Navigation, Activity, X, Check } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function InTransitPage() {
  const { transports, updateTransportStatus } = useCareConnectData();

  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [delayReason, setDelayReason] = useState('Heavy traffic congestion around Megenagna roundabout. Rerouted through Ring Road.');

  const activeTransfers = transports.filter(t =>
    t.status === 'In Transit' || t.status === 'Dispatched' || t.status === 'Assigned'
  );

  const handleUpdateStatus = async (id, newStatus, meta = {}) => {
    await updateTransportStatus(id, newStatus, meta);
  };

  const handleConfirmDelay = async () => {
    if (!selectedTransport) return;
    await updateTransportStatus(selectedTransport.id, 'Delayed', {
      notes: `DELAY ALERT: ${delayReason}`,
      etaMinutes: (selectedTransport.etaMinutes || 20) + 15
    });
    setDelayModalOpen(false);
    setSelectedTransport(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Active In-Transit Emergency Patient Transfers</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Real-time monitoring of ambulances dispatched and en-route across regional transport corridors ({activeTransfers.length} Active)
        </p>
      </div>

      {activeTransfers.length === 0 ? (
        <div className="p-10 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-center text-slate-400">
          <Truck className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300">No ambulances currently en-route</h4>
          <p className="text-[11px] mt-1">Pending requests can be dispatched from the Transport Requests tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTransfers.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400">{t.id}</span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{t.patientName}</h4>
                    <p className="text-slate-500">{t.urgency} Transfer • {t.referralId}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    t.status === 'In Transit'
                      ? 'bg-violet-100 text-violet-700 animate-pulse'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    ● {t.status}
                  </span>
                </div>

                <div className="mt-3 p-3.5 bg-violet-50/60 dark:bg-violet-950/30 rounded-xl border border-violet-100 dark:border-violet-900/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Route:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-right">{t.origin} &rarr; {t.destination}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Assigned Unit:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{t.assignedVehicle} ({t.vehicleType})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Driver & Contact:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {t.driver} (<a href={`tel:${t.driverPhone}`} className="text-violet-600 underline font-mono">{t.driverPhone}</a>)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current Corridor:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{t.routeSector || 'Ring Road Corridor'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Speed / ETA:</span>
                    <span className="font-mono font-bold text-violet-700 dark:text-violet-400">
                      {t.speedKmH || 45} km/h • ETA: {t.etaMinutes ? `${t.etaMinutes} mins` : 'In Transit'}
                    </span>
                  </div>
                </div>

                {t.notes && (
                  <p className="mt-2 text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
                    Note: {t.notes}
                  </p>
                )}
              </div>

              {/* Status Update Stepper Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => { setSelectedTransport(t); setDelayModalOpen(true); }}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg border border-amber-200 cursor-pointer flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Report Delay</span>
                </button>

                <div className="flex items-center gap-1.5 ml-auto">
                  {t.status === 'Dispatched' && (
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'In Transit', { speedKmH: 50, etaMinutes: 18 })}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Departed (In-Transit)
                    </button>
                  )}
                  {t.status === 'In Transit' && (
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'Arrived', { speedKmH: 0, etaMinutes: 0 })}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Arrival</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleUpdateStatus(t.id, 'Completed')}
                    className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl cursor-pointer"
                  >
                    Complete Trip
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delay Modal */}
      {delayModalOpen && selectedTransport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Log Transport Delay Notification</span>
              </h3>
              <button onClick={() => setDelayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-500 text-xs">
              Record travel corridor obstruction or vehicle delay for {selectedTransport.id} ({selectedTransport.patientName}).
            </p>

            <textarea
              rows={3}
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDelayModalOpen(false)}
                className="px-3.5 py-2 border rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelay}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Broadcast Delay Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
