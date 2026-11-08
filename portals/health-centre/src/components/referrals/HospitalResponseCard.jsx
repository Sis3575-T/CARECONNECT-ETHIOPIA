import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  User,
  ArrowRight,
  PlusCircle,
  FileText,
  Calendar,
  Bed,
  Info
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export function HospitalResponseCard({
  referral,
  onOpenInfoRequest
}) {
  const navigate = useNavigate();

  if (!referral) return null;

  const status = (referral.status || 'SUBMITTED').toUpperCase();
  const hospitalName =
    referral.destination_facility_name ||
    referral.destination_hospital_name ||
    'Receiving Hospital';

  // 1. ACCEPTED STATE
  if (status === 'ACCEPTED') {
    return (
      <Card className="p-5 bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                Hospital Triage Decision
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Referral Accepted by {hospitalName}
              </h3>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200">
            ACCEPTED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Assigned Ward / Department</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {referral.assigned_department || referral.required_specialty || 'General Admitting'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Decision Timestamp</span>
            <span className="text-slate-700 dark:text-slate-300">
              {referral.decision_date ? formatClinicalDate(referral.decision_date) : formatClinicalDate(referral.updated_at)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Triage Officer</span>
            <span className="text-slate-700 dark:text-slate-300">
              {referral.decision_by_name || 'Hospital Admitting Clinician'}
            </span>
          </div>
        </div>

        {referral.decision_notes && (
          <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">Admitting Instructions:</span>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {referral.decision_notes}
            </p>
          </div>
        )}

        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
          ✓ Prepare patient transfer summary. The destination triage team has been electronically provisioned for patient arrival.
        </p>
      </Card>
    );
  }

  // 2. REJECTED STATE
  if (status === 'REJECTED') {
    return (
      <Card className="p-5 bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/80 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 block">
                Hospital Triage Decision
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Referral Declined by {hospitalName}
              </h3>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
            DECLINED
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-xs space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Reason for Rejection:
          </span>
          <p className="font-semibold text-slate-900 dark:text-white">
            {referral.rejection_reason || referral.decision_notes || 'Capacity / Specialty Constraint at receiving hospital.'}
          </p>
          {referral.alternative_hospital_recommendation && (
            <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              Suggested Alternative: <strong>{referral.alternative_hospital_recommendation}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Rejection is transparently logged. You can initiate an alternative referral for this patient.
          </p>

          {referral.patient_id && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/create-referral?patientId=${referral.patient_id}`)}
              className="text-xs inline-flex items-center gap-1.5 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Initiate Alternate Referral</span>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // 3. INFORMATION REQUESTED STATE
  if (status === 'INFO_REQUESTED' || referral.has_pending_info_request) {
    return (
      <Card className="p-5 bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                Hospital Coordination Action Required
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Additional Clinical Information Requested
              </h3>
            </div>
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
            ACTION REQUIRED
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {hospitalName}'s triage unit has placed this referral on hold pending further clinical notes, diagnostic imaging, or updated physiological vitals from your health centre.
        </p>

        {onOpenInfoRequest && (
          <div className="pt-1">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onOpenInfoRequest}
              className="text-xs inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Review Request & Provide Clinical Response</span>
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // 4. ACKNOWLEDGED STATE
  if (status === 'ACKNOWLEDGED') {
    return (
      <Card className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 text-xs space-y-2">
        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold">
          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          <span>Referral Acknowledged by {hospitalName}</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          The destination triage officer has confirmed receipt of this electronic transmission. Clinical evaluation and bed capacity assessment are currently in progress.
        </p>
      </Card>
    );
  }

  // 5. SUBMITTED / PENDING REVIEW STATE
  return (
    <Card className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/60 text-xs space-y-2">
      <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-bold">
        <Clock className="w-4 h-4 text-sky-600" />
        <span>Pending Hospital Review</span>
      </div>
      <p className="text-slate-600 dark:text-slate-300">
        This referral has been securely transmitted and is queued for triage at {hospitalName}. Response times are monitored under regional healthcare coordination policies.
      </p>
    </Card>
  );
}

export default HospitalResponseCard;
