import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, RotateCcw } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

export function ReferralTrackingEmptyState({
  hasFilters = false,
  onResetFilters,
  message = 'No referrals found under this criteria.'
}) {
  const navigate = useNavigate();

  return (
    <Card className="p-10 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
        <FileText className="w-6 h-6" />
      </div>

      <div className="max-w-md mx-auto">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {hasFilters ? 'No Matching Referrals' : 'No Referrals Initiated Yet'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {hasFilters
            ? message
            : 'Your health centre has not transmitted any digital referrals yet. Initiate your first clinical transfer below.'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2">
        {hasFilters && onResetFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="text-xs inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Search & Filters</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => navigate('/create-referral')}
            className="text-xs inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Initiate Digital Referral</span>
          </Button>
        )}
      </div>
    </Card>
  );
}

export default ReferralTrackingEmptyState;
