import React, { useState } from 'react';
import { X, CheckCircle, XCircle, HelpCircle, Building2, User, HeartPulse, BedDouble, AlertCircle } from 'lucide-react';

export default function HospitalTriageModal({ isOpen, onClose, referral, onUpdateStatus }) {
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [assignedBed, setAssignedBed] = useState('Ward 4 - Bed 12');

  if (!isOpen || !referral) return null;

  const handleAccept = () => {
    onUpdateStatus(referral.id, 'Accepted');
    onClose();
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('In accordance with CareConnect Ethiopia regulations (FR-22), a clinical or capacity rejection reason must be recorded.');
      return;
    }
    onUpdateStatus(referral.id, 'Rejected', rejectReason);
    onClose();
  };

  const handleRequestInfo = () => {
    onUpdateStatus(referral.id, 'Additional Information Requested');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-base">Incoming Referral Triage</h3>
              <p className="text-xs text-emerald-100">Tikur Anbessa Specialized Hospital Admissions</p>
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
        <div className="p-6 space-y-4">
          {/* Patient Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{referral.patientName}</h4>
                <p className="text-xs text-slate-500">{referral.age ? `${referral.age} yo • ` : ''}Referred from {referral.from}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                referral.status === 'Accepted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {referral.status}
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs space-y-1.5">
              <p><span className="font-semibold text-slate-700">Specialty Service:</span> {referral.service || 'Cardiology'}</p>
              {referral.vitalSigns && (
                <p><span className="font-semibold text-slate-700">Initial Vitals:</span> {referral.vitalSigns}</p>
              )}
              {referral.reason && (
                <p><span className="font-semibold text-slate-700">Clinical Reason:</span> {referral.reason}</p>
              )}
            </div>
          </div>

          {/* Bed Allocation Options */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-950">Bed Availability</p>
                <p className="text-[11px] text-emerald-700">42 Beds free in Black Lion Cardiology Wing</p>
              </div>
            </div>
            <select
              value={assignedBed}
              onChange={(e) => setAssignedBed(e.target.value)}
              className="text-xs bg-white border border-emerald-300 rounded-lg px-2 py-1 text-slate-700 font-medium"
            >
              <option value="Ward 4 - Bed 12">Ward 4 - Bed 12 (Cardio)</option>
              <option value="Ward 4 - Bed 14">Ward 4 - Bed 14 (ICU Step-down)</option>
              <option value="Emergency Holding - Bed 3">Emergency Holding - Bed 3</option>
            </select>
          </div>

          {/* Rejection reason box if rejecting */}
          {isRejecting && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-semibold text-rose-700">
                Reason for Rejection (Mandatory)
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. ICU bed at max capacity; redirecting to St. Paul's Hospital..."
                className="w-full text-xs p-2.5 rounded-lg border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {!isRejecting ? (
              <>
                <button
                  onClick={handleRequestInfo}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Request Info</span>
                </button>
                <button
                  onClick={() => setIsRejecting(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={handleAccept}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Accept Referral</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  Cancel Rejection
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  Confirm Rejection
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
