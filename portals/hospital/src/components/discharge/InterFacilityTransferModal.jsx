import React, { useState, useEffect } from 'react';
import {
  Share2,
  Building2,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Shield,
  Ambulance,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService } from '../../services/hospitalService.js';

const TRANSFER_REASONS = [
  {
    value: 'CLINICAL_ESCALATION',
    label: 'Clinical Escalation / Tertiary Specialty Required',
    desc: 'Patient requires specialized surgical, critical, or diagnostic services exceeding local capability.'
  },
  {
    value: 'SERVICE_UNAVAILABLE',
    label: 'Specialist Service / Modality Unavailable',
    desc: 'Essential specialized intervention (e.g. cath lab, hemodialysis, MRI) temporarily unavailable.'
  },
  {
    value: 'INSUFFICIENT_CAPACITY',
    label: 'Inpatient / ICU Bed Capacity Exhausted',
    desc: 'Critical care or high-dependency beds fully occupied at this hospital.'
  },
  {
    value: 'OPERATIONAL_DIRECTIVE',
    label: 'Operational Directive / Regional Balancing',
    desc: 'Authorized regional health bureau or emergency directive to transfer patient.'
  }
];

const ESCORT_LEVELS = [
  { value: 'STANDARD_AMBULANCE', label: 'Standard EMT / Paramedic Escort' },
  { value: 'NURSE_ESCORT', label: 'Registered Critical Care Nurse Escort' },
  { value: 'PHYSICIAN_ESCORT', label: 'Attending Physician / Specialist Escort' },
  { value: 'PATIENT_TRANSPORT', label: 'Non-Emergency Patient Vehicle' }
];

export function InterFacilityTransferModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  const { user } = useAuth();

  const [destinations, setDestinations] = useState([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);

  // Form states
  const [selectedFacilityId, setSelectedFacilityId] = useState('');
  const [transferReason, setTransferReason] = useState('CLINICAL_ESCALATION');
  const [transferSummary, setTransferSummary] = useState('');
  const [escortLevel, setEscortLevel] = useState('STANDARD_AMBULANCE');
  const [transportNeeded, setTransportNeeded] = useState(true);
  const [confirmedByClinician, setConfirmedByClinician] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Fetch transfer destination facilities
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoadingDestinations(true);

    async function loadDestinations() {
      try {
        const facs = await hospitalService.getTransferDestinations();
        if (isMounted) {
          // Exclude user's current facility
          const currentId = user?.facilityId || referral?.destination_facility_id;
          const eligible = (facs || []).filter(f => String(f.id) !== String(currentId));
          setDestinations(eligible);
          if (eligible.length > 0) {
            setSelectedFacilityId(String(eligible[0].id));
          }
        }
      } catch (err) {
        console.error('[InterFacilityTransferModal] Failed loading destinations:', err);
      } finally {
        if (isMounted) setLoadingDestinations(false);
      }
    }

    loadDestinations();
    return () => {
      isMounted = false;
    };
  }, [isOpen, user?.facilityId, referral?.destination_facility_id]);

  if (!isOpen || !referral) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFacilityId) {
      setErrorMessage('Please select a verified destination hospital facility.');
      return;
    }

    if (!confirmedByClinician) {
      setErrorMessage('You must confirm authorization for this inter-facility clinical transfer.');
      return;
    }

    if (!transferSummary.trim() || transferSummary.trim().length < 10) {
      setErrorMessage('Please provide a detailed clinical handover and transfer summary (minimum 10 characters).');
      return;
    }

    // Tenancy isolation check
    if (user?.facilityId && referral.destination_facility_id && referral.destination_facility_id !== user.facilityId) {
      setErrorMessage('Access denied: You are not authorized to transfer referrals assigned to another hospital.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedFac = destinations.find(d => String(d.id) === String(selectedFacilityId));
      const targetName = selectedFac ? selectedFac.name : `Facility #${selectedFacilityId}`;

      const payload = {
        new_facility_id: Number(selectedFacilityId) || selectedFacilityId,
        reassignment_reason: transferReason,
        reassignment_notes: `Transfer to ${targetName}. Reason: ${transferReason}. Escort: ${escortLevel}. Summary: ${transferSummary.trim()}`,
        escort_required: escortLevel !== 'PATIENT_TRANSPORT',
        transfer_summary: transferSummary.trim(),
        target_facility_name: targetName,
        transport_needed: transportNeeded
      };

      const updated = await hospitalService.recordTransfer(referral.id, payload);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      console.error('[InterFacilityTransferModal] Transfer error:', err);
      setErrorMessage(err?.response?.data?.message || err.message || 'Failed to submit inter-facility transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = referral.patient?.full_name || referral.patient?.name || referral.patient_name || 'Patient';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      data-testid="inter-facility-transfer-modal"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="transfer-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Inter-Facility Clinical Transfer Workflow
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{patientName}</span> ({referral.referral_code || `REF-${referral.id}`})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Clinician Human Choice Notice */}
          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
            <Shield className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              <strong>Clinician-Directed Decision:</strong> Inter-facility transfers require human clinical selection and authorization of the receiving hospital facility based on clinical indications.
            </span>
          </div>

          {/* Destination Hospital Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-purple-600" />
              <span>Destination Receiving Hospital *</span>
            </label>
            {loadingDestinations ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"></div>
            ) : (
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                required
              >
                {destinations.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.region || 'Ethiopia'}) — {fac.level || 'Hospital'}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Transfer Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Transfer Reason Code *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TRANSFER_REASONS.map((opt) => {
                const selected = transferReason === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setTransferReason(opt.value)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      selected
                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-100 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {selected && <CheckCircle className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clinical Handover & Transfer Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Clinical Handover & Transfer Indication Summary *
            </label>
            <textarea
              rows={4}
              value={transferSummary}
              onChange={(e) => setTransferSummary(e.target.value)}
              placeholder="State current patient stability, immediate clinical requirements at receiving hospital, diagnostic findings, and medications administered..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              required
            />
            <span className="text-[11px] text-slate-400">
              Minimum 10 characters summarizing clinical reasons for hospital transfer.
            </span>
          </div>

          {/* Escort Level & Transport Coordination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Ambulance className="w-3.5 h-3.5 text-purple-600" />
                <span>Medical Escort Level</span>
              </label>
              <select
                value={escortLevel}
                onChange={(e) => setEscortLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {ESCORT_LEVELS.map((esc) => (
                  <option key={esc.value} value={esc.value}>
                    {esc.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 pt-3">
                <input
                  type="checkbox"
                  checked={transportNeeded}
                  onChange={(e) => setTransportNeeded(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  <strong>Notify Transport Coordination:</strong> Request emergency transfer ambulance dispatch automatically.
                </span>
              </label>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={confirmedByClinician}
                onChange={(e) => setConfirmedByClinician(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span>
                <strong className="font-semibold text-slate-900 dark:text-slate-100">
                  I authorize this inter-facility transfer.
                </strong>{' '}
                I certify that the receiving facility has been consulted or designated and patient handover documentation is complete.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !confirmedByClinician}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {submitting ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Transfer...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Authorize & Transfer Patient</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InterFacilityTransferModal;
