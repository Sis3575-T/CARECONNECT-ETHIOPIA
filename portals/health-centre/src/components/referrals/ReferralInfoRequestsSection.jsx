import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  Paperclip,
  Clock,
  User,
  Building2,
  FileText,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { referralTrackingService } from '../../services/referralTrackingService.js';
import { formatClinicalDate, formatRelativeTime } from '@shared/utils/formatters.js';

export function ReferralInfoRequestsSection({
  referralId,
  onResponseSubmitted
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active responding form state
  const [respondingId, setRespondingId] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchRequests = async () => {
    if (!referralId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await referralTrackingService.getInformationRequests(referralId);
      setRequests(data || []);
    } catch (err) {
      setError('Unable to load information requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [referralId]);

  const handleSubmitResponse = async (requestId) => {
    if (!responseText || responseText.trim().length < 5) {
      setSubmitError('Response notes are required and must be at least 5 characters');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      let attachmentIds = [];
      if (selectedFile) {
        try {
          const doc = await referralTrackingService.uploadReferralDocument(referralId, selectedFile, {
            title: `Info Request Response: ${selectedFile.name}`,
            documentType: 'CLINICAL_NOTE',
            description: responseText.trim().substring(0, 100)
          });
          if (doc?.id) attachmentIds.push(doc.id);
        } catch (uploadErr) {
          // Continue with response note even if file fails
        }
      }

      await referralTrackingService.respondToInformationRequest(referralId, requestId, {
        response_notes: responseText.trim(),
        attachment_ids: attachmentIds
      });

      setSuccessMsg('Clinical response successfully transmitted to the hospital.');
      setRespondingId(null);
      setResponseText('');
      setSelectedFile(null);
      await fetchRequests();
      if (onResponseSubmitted) onResponseSubmitted();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit response. Please check network.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <Spinner size="sm" className="mx-auto mb-1 text-sky-600" />
        <span className="text-xs text-slate-400">Loading information requests...</span>
      </Card>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show section if no info requests exist
  }

  return (
    <Card className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Hospital Information Requests ({requests.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">Coordination Channel</span>
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

      <div className="space-y-4">
        {requests.map((req) => {
          const isPending = req.request_status === 'PENDING' || !req.responded_at;
          const isCurrentResponding = respondingId === req.id;

          return (
            <div
              key={req.id}
              className={`p-4 rounded-xl border text-xs space-y-3 transition-colors ${
                isPending
                  ? 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/40'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {req.hospital_name || 'Hospital Clinical Triage'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300'
                      }`}
                    >
                      {isPending ? 'PENDING RESPONSE' : 'RESPONDED'}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Requested on {formatClinicalDate(req.created_at)} ({formatRelativeTime(req.created_at)})
                  </span>
                </div>

                {req.deadline && isPending && (
                  <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due: {formatClinicalDate(req.deadline)}</span>
                  </div>
                )}
              </div>

              {/* Inquiry Question from Hospital */}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {req.requested_information || req.notes || 'Additional clinical information requested.'}
              </div>

              {/* Responded Details if already submitted */}
              {!isPending && req.response_notes && (
                <div className="p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-teal-800 dark:text-teal-300 font-bold">
                    <span>Health Centre Response:</span>
                    <span>{formatClinicalDate(req.responded_at)}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {req.response_notes}
                  </p>
                </div>
              )}

              {/* Action Form if Pending */}
              {isPending && (
                <div>
                  {isCurrentResponding ? (
                    <div className="space-y-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                      {submitError && (
                        <div role="alert" className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Clinical Findings & Response Details *
                        </label>
                        <textarea
                          rows={3}
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Provide updated clinical observations, test findings, or clarifications for the triage team (minimum 5 characters)..."
                          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 text-xs"
                        />
                      </div>

                      {/* Optional File Attachment */}
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-sky-600 hover:underline cursor-pointer flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{selectedFile ? selectedFile.name : 'Attach Diagnostic File (Optional)'}</span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="hidden"
                          />
                        </label>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="text-slate-400 hover:text-rose-600 text-[10px]"
                          >
                            [Remove]
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={submitting}
                          onClick={() => {
                            setRespondingId(null);
                            setSubmitError(null);
                          }}
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={submitting || responseText.trim().length < 5}
                          onClick={() => handleSubmitResponse(req.id)}
                          className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white min-w-[130px] justify-center"
                        >
                          {submitting ? (
                            <>
                              <Spinner size="xs" className="mr-1" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Transmit Response</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setRespondingId(req.id);
                        setResponseText('');
                        setSubmitError(null);
                      }}
                      className="text-xs inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Provide Response to Hospital</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default ReferralInfoRequestsSection;
