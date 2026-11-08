import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Send,
  Sparkles,
  Users
} from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Badge } from '@shared/components/display/Badge.jsx';
import { Select } from '@shared/components/forms/Select.jsx';
import { Textarea } from '@shared/components/forms/Textarea.jsx';
import { Alert } from '@shared/components/feedback/Alert.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { patientService } from '../../services/patientService.js';
import { formatPatientId, formatEthiopianPhone } from '@shared/utils/formatters.js';

const REVIEW_OUTCOME_OPTIONS = [
  { value: 'CONFIRMED_MATCH', label: 'Confirmed Duplicate Match (Same Individual)' },
  { value: 'FALSE_POSITIVE', label: 'False Positive (Distinct Individuals)' },
  { value: 'UNDER_INVESTIGATION', label: 'Under Investigation / Need Physical Records' }
];

export function PatientDuplicateReviewSection({ patient, onReviewCompleted }) {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active candidate under review
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('FALSE_POSITIVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  const fetchDuplicates = async () => {
    if (!patient?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await patientService.getPossibleDuplicates(patient.id);
      setCandidates(data || []);
      if (data && data.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data[0]);
      }
    } catch (err) {
      setError('Unable to load potential duplicate records for comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, [patient?.id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    setSubmitting(true);
    setReviewSuccess(null);
    setError(null);

    try {
      await patientService.recordDuplicateReview(patient.id, {
        candidate_patient_id: selectedCandidate.patient.id,
        review_status: reviewStatus,
        match_score: selectedCandidate.match_score,
        match_signals: selectedCandidate.match_signals || [],
        notes: reviewNotes.trim() || undefined
      });

      setReviewSuccess(`Duplicate review outcome recorded: ${reviewStatus}`);
      setReviewNotes('');

      // Refresh candidate list
      await fetchDuplicates();

      if (onReviewCompleted) {
        onReviewCompleted();
      }
    } catch (err) {
      setError(err?.message || 'Failed to submit duplicate review outcome');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <Spinner size="md" className="mx-auto mb-2 text-sky-600" />
        <p className="text-xs text-slate-500">Checking for duplicate records across facility boundary...</p>
      </Card>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card className="p-6 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Zero Duplicate Conflicts Detected
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-0.5">
              Deterministic & probabilistic identity scoring found no potential duplicate patient records matching this profile.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/50 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-amber-900/30">
        <div className="flex items-center space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Duplicate Record Governance ({candidates.length} Candidate Match)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deterministic scoring detected matching demographic or identifier signals. Human review required.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {reviewSuccess && (
        <Alert variant="success">
          {reviewSuccess}
        </Alert>
      )}

      {/* Candidate Selector Tabs */}
      {candidates.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 shrink-0">Candidates:</span>
          {candidates.map((cand, idx) => (
            <button
              key={cand.patient.id}
              type="button"
              onClick={() => setSelectedCandidate(cand)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                selectedCandidate?.patient?.id === cand.patient.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              #{idx + 1}: {cand.patient.full_name} ({cand.match_score}%)
            </button>
          ))}
        </div>
      )}

      {/* Side-by-Side Comparison Box */}
      {selectedCandidate && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Patient (Current Record) */}
            <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/30 dark:bg-sky-950/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-sky-100 dark:border-sky-900/40">
                <span className="font-semibold text-sky-900 dark:text-sky-200 uppercase text-[11px]">
                  Target Patient (This Record)
                </span>
                <span className="font-mono text-sky-700 dark:text-sky-300 font-bold">
                  {formatPatientId(patient.id)}
                </span>
              </div>
              <div className="space-y-1">
                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-900 dark:text-white">{patient.full_name || `${patient.first_name} ${patient.father_name}`}</strong></div>
                <div><span className="text-slate-500">Demographics:</span> {patient.gender}, Age {patient.age_years ?? '—'}</div>
                <div><span className="text-slate-500">Phone:</span> {patient.phone_number ? formatEthiopianPhone(patient.phone_number) : 'None'}</div>
                <div><span className="text-slate-500">Fayda ID:</span> <span className="font-mono">{patient.national_id || 'None'}</span></div>
                <div><span className="text-slate-500">Woreda / Region:</span> {[patient.woreda, patient.region].filter(Boolean).join(', ') || '—'}</div>
              </div>
            </div>

            {/* Candidate Duplicate Record */}
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100 dark:border-amber-900/40">
                <span className="font-semibold text-amber-900 dark:text-amber-200 uppercase text-[11px]">
                  Potential Duplicate Match ({selectedCandidate.match_score}% Confidence)
                </span>
                <span className="font-mono text-amber-700 dark:text-amber-300 font-bold">
                  {formatPatientId(selectedCandidate.patient.id)}
                </span>
              </div>
              <div className="space-y-1">
                <div><span className="text-slate-500">Name:</span> <strong className="text-slate-900 dark:text-white">{selectedCandidate.patient.full_name}</strong></div>
                <div><span className="text-slate-500">Demographics:</span> {selectedCandidate.patient.gender}, Age {selectedCandidate.patient.age_years ?? '—'}</div>
                <div><span className="text-slate-500">Phone:</span> {selectedCandidate.patient.phone_number ? formatEthiopianPhone(selectedCandidate.patient.phone_number) : 'None'}</div>
                <div><span className="text-slate-500">Fayda ID:</span> <span className="font-mono">{selectedCandidate.patient.national_id || 'None'}</span></div>
                <div><span className="text-slate-500">Woreda / Region:</span> {[selectedCandidate.patient.woreda, selectedCandidate.patient.region].filter(Boolean).join(', ') || '—'}</div>
              </div>

              {/* Matching Signals */}
              {selectedCandidate.match_signals && selectedCandidate.match_signals.length > 0 && (
                <div className="pt-2 border-t border-amber-100 dark:border-amber-900/40">
                  <span className="text-slate-500 block text-[11px] mb-1">Triggered Match Signals:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCandidate.match_signals.map((sig, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-mono">
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clinician Duplicate Review Form */}
          <form onSubmit={handleSubmitReview} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Submit Clinical Duplicate Resolution
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Clinical Review Decision *"
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                options={REVIEW_OUTCOME_OPTIONS}
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Clinical Governance Notes / Reasoning
                </label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Verified Kebele ID card and family relation; confirmed separate twin brother"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate(`/patients/${encodeURIComponent(selectedCandidate.patient.id)}`)}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Candidate Full Record</span>
              </button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    <span>Saving Decision...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Record Duplicate Review</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}

export default PatientDuplicateReviewSection;
