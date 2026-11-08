import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  FileQuestion,
  FileText,
  AlertCircle,
  Info,
  Clock
} from 'lucide-react';
import { hospitalService } from '../../services/hospitalService.js';

const QUICK_TAGS = [
  'Recent / Serial Vital Signs',
  'Full Blood Count / Lab Chemistries',
  'Chest Radiograph / Imaging Report',
  'Pre-referral Medication History',
  'Surgical / Obstetric Notes',
  'Maternal / Fetal Monitoring Data'
];

export default function ReferralRequestInfoModal({
  isOpen,
  onClose,
  referral,
  onSuccess
}) {
  if (!isOpen || !referral) return null;

  const [notes, setNotes] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleTagClick = (tag) => {
    setSelectedTag(tag);
    if (!notes.includes(tag)) {
      setNotes((prev) => (prev ? `${prev}\n• Please provide: ${tag}` : `• Please provide: ${tag}`));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = notes.trim();
    if (!trimmed || trimmed.length < 5) {
      setError('Please provide a specific clinical question or details on what additional information is required (minimum 5 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await hospitalService.requestInformation(referral.id, { notes: trimmed });
      if (onSuccess) {
        onSuccess(result, 'Additional clinical information requested from referring health centre. Referral status updated to INFO_REQUESTED.');
      }
      onClose();
    } catch (err) {
      console.error('[HospitalRequestInfoModal] Submission error:', err);
      setError(err?.message || 'Failed to submit information request. Please verify connectivity and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = referral.patient_name || referral.patientName || 'Unnamed Patient';
  const refCode = referral.reference_number || referral.id;
  const originFacility = referral.origin_facility_name || 'Referring Health Centre';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-info-modal-title"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/60 overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-amber-100 dark:border-amber-950/60 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="request-info-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Request Additional Clinical Information
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Send clinical inquiry to <strong>{originFacility}</strong> regarding {patientName} ({refCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-800 dark:text-blue-200">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Two-Way Referral Coordination Notice</p>
              <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                This request does not reject the referral. The referring health centre will receive an urgent notification to attach missing diagnostics or provide requested clinical answers.
              </p>
            </div>
          </div>

          {/* Quick Selection Helper Tags */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileQuestion className="w-3.5 h-3.5 text-slate-400" />
              <span>Common Clinical Clarifications</span>
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagClick(tag)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 hover:border-amber-400 text-slate-700 dark:text-slate-300 text-[11px] transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Information Requested Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="info-notes-input" className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Information Needed / Clinical Questions *</span>
              </label>
              <span className={`text-[10px] ${notes.trim().length >= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                {notes.trim().length} / 5 min characters
              </span>
            </div>
            <textarea
              id="info-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="State clearly what information or test results are needed before hospital specialist admission can be finalized..."
              required
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || notes.trim().length < 5}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting Inquiry...</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4" />
                  <span>Send Clarification Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
