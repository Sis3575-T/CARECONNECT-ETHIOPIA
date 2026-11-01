import React from 'react';
import { X, Truck, Phone, Navigation, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function TransportDetailModal({ isOpen, onClose, request, onUpdateStatus }) {
  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-violet-200" />
            <div>
              <h3 className="font-bold text-base leading-tight">Transport Coordination Dispatch</h3>
              <p className="text-xs text-violet-100">CareConnect Ambulance Network • Addis Ababa Region</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {/* Patient and Route */}
          <div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{request.patientName}</h4>
                <p className="text-slate-500">{request.condition || 'Emergency Care Coordination'}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800">
                {request.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-violet-100">
              <div><span className="font-semibold text-slate-700">Origin:</span> {request.from}</div>
              <div><span className="font-semibold text-slate-700">Destination:</span> {request.to}</div>
              <div><span className="font-semibold text-slate-700">Estimated Arrival:</span> {request.eta}</div>
              <div><span className="font-semibold text-slate-700">Remaining:</span> {request.distanceRemaining || '4.8 km'}</div>
            </div>
          </div>

          {/* Assigned Ambulance Asset */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              <span>Assigned Ambulance Resource</span>
            </h5>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{request.ambulanceId || 'AMB-AA-04 (ALS)'}</p>
                <p className="text-slate-500">Driver: {request.driverName || 'Tilahun Mengesha'}</p>
              </div>
              <a
                href={`tel:${request.driverPhone || '+251911234567'}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Driver</span>
              </a>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
            <Clock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Traffic update: Moderate congestion near Mexico Square; route recalculation active.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onUpdateStatus) onUpdateStatus(request.id, 'Arrived');
                onClose();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Patient Arrival</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
