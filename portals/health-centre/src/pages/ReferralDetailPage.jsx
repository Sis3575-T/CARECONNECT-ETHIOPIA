import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { Spinner } from '@shared/components/feedback/Spinner.jsx';
import { referralTrackingService } from '../services/referralTrackingService.js';
import { ReferralTrackingErrorState } from '../components/referrals/ReferralTrackingErrorState.jsx';
import { ReferralStatusBadge } from '../components/referrals/ReferralStatusBadge.jsx';
import { ReferralPriorityBadge } from '../components/referrals/ReferralPriorityBadge.jsx';

export default function ReferralDetailPage() {
  const { referralId } = useParams();
  const navigate = useNavigate();

  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  const fetchReferral = async () => {
    if (!referralId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await referralTrackingService.getReferralById(referralId);
      setReferral(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve referral details.');
      setStatusCode(err.status || err.statusCode || 500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferral();
  }, [referralId]);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Spinner size="lg" className="mx-auto mb-2 text-sky-600" />
        <p className="text-xs text-slate-500">Loading referral record...</p>
      </div>
    );
  }

  if (error || !referral) {
    return (
      <ReferralTrackingErrorState
        error={error || 'Referral record not found.'}
        statusCode={statusCode}
        onRetry={fetchReferral}
        onBack={() => navigate('/referrals')}
      />
    );
  }

  const referenceCode = referral.reference_number || referral.referral_code || referral.id;

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={() => navigate('/referrals')}
            className="inline-flex items-center text-xs text-slate-500 hover:text-sky-600 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Referrals Tracker
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
              {referenceCode}
            </h1>
            <ReferralStatusBadge status={referral.status} />
            <ReferralPriorityBadge priority={referral.priority} />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchReferral}
          className="text-xs inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Referral Overview</h2>
        <p className="text-xs text-slate-500">
          Primary Diagnosis: <span className="font-semibold text-slate-800 dark:text-slate-200">{referral.primary_diagnosis || 'None'}</span>
        </p>
      </Card>
    </div>
  );
}
