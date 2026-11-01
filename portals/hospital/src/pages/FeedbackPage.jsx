import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, User, FileText, Check } from 'lucide-react';
import { useCareConnectData } from '@shared/hooks/useCareConnectData';

export default function FeedbackPage() {
  const { referrals, feedback, createFeedback } = useCareConnectData();

  const [selectedRefId, setSelectedRefId] = useState(referrals[0]?.id || '');
  const [outcome, setOutcome] = useState('Successfully Admitted & Under Intervention');
  const [dischargeSummary, setDischargeSummary] = useState(
    'Patient underwent emergency coronary catheterization. Stent deployed in LAD coronary artery with TIMI 3 flow restored. Patient hemodynamically stable in CCU.'
  );
  const [recommendations, setRecommendations] = useState(
    'Maintain Dual Antiplatelet Therapy (Aspirin 81mg + Clopidogrel 75mg daily) for 12 months. Follow-up lipid profile and renal function in 4 weeks at Yeka Health Centre.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedRef = referrals.find(r => r.id === selectedRefId) || referrals[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    await createFeedback({
      referralId: selectedRefId,
      patientName: selectedRef?.patientName || 'Referred Patient',
      referringFacility: selectedRef?.referringFacility || 'Yeka Health Centre',
      receivingFacility: selectedRef?.receivingFacility || 'Tikur Anbessa Hospital',
      attendingPhysician: 'Dr. Fitsum Tadesse (Senior Consultant)',
      outcome,
      dischargeSummary,
      recommendationsToHealthCentre: recommendations
    });

    setIsSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Clinical Feedback & Referral Outcome Management</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Provide post-admission clinical summaries and follow-up guidance to referring primary health centres
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-4">
        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Target Patient Referral</label>
          <select
            value={selectedRefId}
            onChange={(e) => setSelectedRefId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-slate-900 dark:text-white"
          >
            {referrals.map(r => (
              <option key={r.id} value={r.id}>
                {r.id} — {r.patientName} ({r.service} • From: {r.referringFacility})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Clinical & Administrative Outcome</label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-emerald-600 dark:text-emerald-400"
          >
            <option value="Successfully Admitted & Under Intervention">Successfully Admitted & Under Intervention</option>
            <option value="Specialty Service Completed & Discharged">Specialty Service Completed & Discharged</option>
            <option value="Transferred to Sub-specialty Unit">Transferred to Sub-specialty Unit</option>
            <option value="Outpatient Follow-up Scheduled">Outpatient Follow-up Scheduled</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Intervention & Discharge Summary</label>
          <textarea
            rows={4}
            required
            value={dischargeSummary}
            onChange={(e) => setDischargeSummary(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 leading-relaxed text-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Recommendations & Follow-up Plan for Health Centre</label>
          <textarea
            rows={3}
            required
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 leading-relaxed text-slate-800 dark:text-white"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          {success && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4" /> Feedback report transmitted to referring health centre!
            </span>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-auto px-6 py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Transmitting...' : 'Transmit Feedback Report'}</span>
          </button>
        </div>
      </form>

      {/* Previously Transmitted Feedback Logs */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Transmitted Outcome Feedback History</h3>
        {feedback.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            No feedback reports transmitted yet.
          </div>
        ) : (
          feedback.map((f) => (
            <div key={f.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-emerald-600 font-bold">{f.id} • {f.referralId}</span>
                <span className="text-slate-400 text-[10px] font-mono">{f.submittedDate}</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">{f.patientName} ({f.referringFacility})</h4>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">{f.dischargeSummary}</p>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[11px]">
                <b>Recommended Follow-up:</b> {f.recommendationsToHealthCentre}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
