import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

export default function ReferralDetailPage() {
  const { referralId } = useParams();

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-xs">
      <div className="flex items-center gap-3">
        <Link
          to="/incoming"
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-1 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incoming Queue</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-emerald-600 animate-spin" />
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Incoming Referral #{referralId}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Loading incoming clinical referral profile...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
