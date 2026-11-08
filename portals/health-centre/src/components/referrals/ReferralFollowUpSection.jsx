import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  MessageSquare,
  Mail,
  Building,
  PlusCircle,
  Clock,
  User,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { referralTrackingService } from '../../services/referralTrackingService.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

const CHANNELS = [
  { value: 'PHONE_CALL', label: 'Phone Call (Voice)', icon: PhoneCall },
  { value: 'SMS', label: 'SMS Notification', icon: MessageSquare },
  { value: 'EMAIL', label: 'Email', icon: Mail },
  { value: 'IN_PLATFORM', label: 'In-Platform Coordination', icon: Building },
  { value: 'MANUAL', label: 'In-Person / Direct Handover', icon: User }
];

export function ReferralFollowUpSection({
  referralId,
  onFollowUpAdded
}) {
  const [followUps, setFollowUps] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [delays, setDelays] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Follow-up Form
  const [isAdding, setIsAdding] = useState(false);
  const [channel, setChannel] = useState('PHONE_CALL');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadFollowUpData = async () => {
    if (!referralId) return;
    setLoading(true);
    try {
      const [fData, eData, dData] = await Promise.allSettled([
        referralTrackingService.getFollowUps(referralId),
        referralTrackingService.getEscalations(referralId),
        referralTrackingService.getDelays(referralId)
      ]);

      if (fData.status === 'fulfilled') setFollowUps(fData.value || []);
      if (eData.status === 'fulfilled') setEscalations(eData.value || []);
      if (dData.status === 'fulfilled') setDelays(dData.value || null);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUpData();
  }, [referralId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outcome || outcome.trim().length < 2) {
      setSubmitError('Follow-up outcome is required (minimum 2 characters)');
      return;
    }
    if (!notes || notes.trim().length < 3) {
      setSubmitError('Follow-up notes are required (minimum 3 characters)');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await referralTrackingService.recordFollowUp(referralId, {
        communication_channel: channel,
        outcome: outcome.trim(),
        reason_or_notes: notes.trim(),
        next_follow_up_date: nextDate ? new Date(nextDate).toISOString() : undefined
      });

      setSuccessMsg('Referral follow-up interaction recorded.');
      setIsAdding(false);
      setOutcome('');
      setNotes('');
      setNextDate('');
      await loadFollowUpData();
      if (onFollowUpAdded) onFollowUpAdded();
    } catch (err) {
      setSubmitError(err.message || 'Failed to record follow-up.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Spinner size="sm" className="mx-auto mb-1 text-sky-600" />
        <span className="text-xs text-slate-400">Loading coordination follow-ups...</span>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Operational Escalation & Delay Warning (If active) */}
      {escalations.length > 0 && (
        <Card className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Operational SLA Escalation Active ({escalations.length})</span>
          </div>

          <div className="divide-y divide-amber-200/60 dark:divide-amber-900/40">
            {escalations.map((esc) => (
              <div key={esc.id} className="py-2 text-[11px] space-y-0.5">
                <div className="flex items-center justify-between font-semibold">
                  <span>Level {esc.escalation_level || 1} — {esc.escalation_status || 'OPEN'}</span>
                  <span className="text-slate-400">{formatClinicalDate(esc.created_at)}</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{esc.reason || esc.notes}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-amber-800/80 dark:text-amber-400 italic pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
            Note: Operational escalation tracks administrative response timeliness and inter-facility coordination. It does not replace or modify clinical urgency.
          </p>
        </Card>
      )}

      {/* Main Follow-up Section Card */}
      <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Follow-up & Coordination Notes ({followUps.length})
            </h3>
          </div>

          {!isAdding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="text-xs inline-flex items-center gap-1.5 h-7 px-2.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record Follow-up</span>
            </Button>
          )}
        </div>

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Record Follow-up Form */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 text-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-sky-100 dark:border-sky-900/40">
              <span className="font-bold text-slate-900 dark:text-white">Record Coordination Interaction</span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setSubmitError(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {submitError && (
              <div role="alert" className="p-2 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Communication Channel *
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  {CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Follow-up Outcome *
                </label>
                <input
                  type="text"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="e.g. Hospital confirmed bed; Ambulance en route"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Interaction Notes & Details *
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Document specific details of discussion, contact person, or coordination status..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Next Follow-up Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                className="bg-sky-600 hover:bg-sky-700 text-white min-w-[120px]"
              >
                {submitting ? <Spinner size="xs" className="mx-auto" /> : 'Save Follow-up'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing Follow-ups List */}
        {followUps.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {followUps.map((f) => {
              const chConfig = CHANNELS.find((c) => c.value === f.communication_channel) || {
                label: f.communication_channel,
                icon: PhoneCall
              };
              const ChannelIcon = chConfig.icon;

              return (
                <div key={f.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <ChannelIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{f.outcome || 'Follow-up Interaction'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {formatClinicalDate(f.created_at)} ({formatRelativeTime(f.created_at)})
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 pl-5 leading-relaxed">
                    {f.reason_or_notes || f.notes}
                  </p>

                  <div className="flex items-center gap-3 pl-5 text-[11px] text-slate-400 pt-0.5">
                    <span>Channel: {chConfig.label}</span>
                    {f.actor_name && <span>• Logged by: {f.actor_name}</span>}
                    {f.next_follow_up_date && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        • Next check: {formatClinicalDate(f.next_follow_up_date)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic text-center py-2">
            No coordination follow-ups recorded yet.
          </p>
        )}
      </Card>
    </div>
  );
}

export default ReferralFollowUpSection;
