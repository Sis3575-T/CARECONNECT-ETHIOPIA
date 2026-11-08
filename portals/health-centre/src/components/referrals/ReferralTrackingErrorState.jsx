import React from 'react';
import { AlertCircle, RefreshCw, ShieldAlert, ArrowLeft } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

export function ReferralTrackingErrorState({
  error,
  statusCode,
  onRetry,
  onBack,
  title = 'Failed to load referral tracking records'
}) {
  const isForbidden = statusCode === 403 || error?.toLowerCase().includes('permission') || error?.toLowerCase().includes('forbidden');

  return (
    <Card
      role="alert"
      className="p-8 text-center max-w-lg mx-auto bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50 shadow-sm space-y-4"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
        isForbidden
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
      }`}>
        {isForbidden ? <ShieldAlert className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isForbidden ? 'Access Restricted' : title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          {error || 'Unable to retrieve referral coordination details from the server.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onBack}
            className="text-xs inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </Button>
        )}

        {onRetry && !isForbidden && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onRetry}
            className="text-xs inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Query</span>
          </Button>
        )}
      </div>
    </Card>
  );
}

export default ReferralTrackingErrorState;
