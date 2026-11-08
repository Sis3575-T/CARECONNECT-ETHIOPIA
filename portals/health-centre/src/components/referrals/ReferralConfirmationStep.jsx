import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  Printer,
  ListFilter,
  PlusCircle,
  Building2,
  User,
  Clock,
  Ambulance,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

export function ReferralConfirmationStep({
  referral,
  patient,
  destinationData,
  clinicalData,
  attachedFilesCount = 0,
  onReset
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const referenceNumber =
    referral?.reference_number ||
    referral?.referral_code ||
    referral?.id ||
    'ETH-REF-RECORDED';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const priorityColor =
    clinicalData?.priority === 'EMERGENCY'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
      : clinicalData?.priority === 'URGENT'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-2">
      {/* Success Badge & Reference Banner */}
      <Card className="p-8 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden" role="status" aria-live="polite">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Digital Referral Successfully Submitted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-lg mx-auto">
          The clinical referral record has been securely created in CareConnect Ethiopia and forwarded to the receiving hospital's electronic triage queue.
        </p>

        {/* Reference Number Box */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Official Ethiopian Referral Reference
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white select-all">
              {referenceNumber}
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 h-9 px-3 text-xs flex items-center gap-1.5 border-slate-300 dark:border-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label={copied ? "Referral reference code copied" : "Copy referral reference code"}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Referral Summary Details Card */}
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Referral Summary Confirmation</span>
          </h3>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${priorityColor}`}>
              {clinicalData?.priority || 'ROUTINE'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
              SUBMITTED
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Patient Details */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Patient Name & ID
            </span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {[patient?.first_name, patient?.middle_name, patient?.last_name].filter(Boolean).join(' ') || 'N/A'}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              MRN: {patient?.patient_reference || patient?.mrn || 'N/A'} • Age: {patient?.age || 'N/A'} • {patient?.gender || ''}
            </p>
          </div>

          {/* Destination Details */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Receiving Hospital & Service
            </span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {destinationData?.destination_facility_name || 'Destination Hospital'}
            </p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              Department: {destinationData?.required_specialty || 'Clinical Triage'}
            </p>
          </div>

          {/* Diagnosis & Treatment */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Primary Diagnosis</span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {clinicalData?.primary_diagnosis || 'Not specified'}
            </p>
          </div>

          {/* Transport status */}
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 block">Transport Coordination</span>
            <div className="flex items-center gap-1.5">
              {clinicalData?.transport_required ? (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                  <Ambulance className="w-3.5 h-3.5" />
                  Ambulance Dispatch Requested
                </span>
              ) : (
                <span className="text-slate-500">Self / Standard Transport</span>
              )}
            </div>
          </div>
        </div>

        {attachedFilesCount > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500">
            <FileText className="w-4 h-4 text-sky-600" />
            <span>{attachedFilesCount} diagnostic document(s) uploaded and attached to the electronic patient record.</span>
          </div>
        )}
      </Card>

      {/* Next Steps Card */}
      <Card className="p-5 bg-sky-50/50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40 text-xs space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Next Operational Steps</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
          <li>Provide the patient or accompanying relative with the Referral Reference Code (<strong className="font-mono text-slate-800 dark:text-slate-200">{referenceNumber}</strong>).</li>
          <li>The receiving hospital triage unit has been notified and can review the clinical history in real time.</li>
          {clinicalData?.transport_required && (
            <li>The regional ambulance coordination team will review the dispatch request.</li>
          )}
          <li>You can monitor updates, acceptance, bed assignment, or transport status in the Referrals Tracking workspace.</li>
        </ol>
      </Card>

      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Print Referral Summary</span>
        </Button>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Another Referral</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => navigate('/referrals')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs bg-sky-600 hover:bg-sky-700 text-white"
          >
            <ListFilter className="w-4 h-4" />
            <span>View Referrals Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReferralConfirmationStep;
