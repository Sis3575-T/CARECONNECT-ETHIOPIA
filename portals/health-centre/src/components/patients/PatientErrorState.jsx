import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';

export function PatientErrorState({
  title = 'Failed to load patient records',
  message = 'An unexpected error occurred while communicating with the health facility repository.',
  onRetry = null,
  isRetrying = false
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-8 text-center my-6"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-4">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-200 mb-2">
        {title}
      </h3>
      <p className="text-sm text-rose-700 dark:text-rose-300/90 max-w-md mx-auto mb-6">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center space-x-2 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40"
        >
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Retry Request'}</span>
        </Button>
      )}
    </div>
  );
}

export default PatientErrorState;
