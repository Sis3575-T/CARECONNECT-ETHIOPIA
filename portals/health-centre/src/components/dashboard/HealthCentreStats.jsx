import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Send,
  Clock,
  CheckCircle2,
  Truck,
  AlertTriangle,
  RotateCw,
  TrendingUp
} from 'lucide-react';
import { Skeleton } from '@shared/components/feedback/Skeleton.jsx';
import { Alert } from '@shared/components/feedback/Alert.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

/**
 * HealthCentreStats Component
 * Displays real-time operational statistics for the health centre.
 * Supports loading skeletons, zero-safe values, accessible labels, and error retry.
 */
export function HealthCentreStats({
  summary,
  loading = false,
  error = null,
  onRetry
}) {
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Unable to retrieve live operational metrics from backend.</span>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="text-xs shrink-0 self-start sm:self-auto border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5"
        role="status"
        aria-label="Loading facility statistics"
      >
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col justify-between h-28"
          >
            <div className="flex items-center justify-between">
              <Skeleton variant="circular" className="w-9 h-9" />
              <Skeleton width="40px" height="12px" />
            </div>
            <div className="space-y-1 mt-2">
              <Skeleton width="60px" height="24px" />
              <Skeleton width="80px" height="12px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      id: 'patients',
      label: 'Registered Patients',
      value: summary?.totalPatients ?? 0,
      icon: Users,
      color: 'sky',
      iconBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900',
      badge: 'Active Roster',
      onClick: () => navigate('/patients')
    },
    {
      id: 'active',
      label: 'Active Referrals',
      value: summary?.activeReferrals ?? 0,
      icon: Send,
      color: 'blue',
      iconBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900',
      badge: `${summary?.totalReferrals ?? 0} Total`,
      onClick: () => navigate('/referrals')
    },
    {
      id: 'pending',
      label: 'Awaiting Triage',
      value: summary?.pendingCount ?? 0,
      icon: Clock,
      color: 'amber',
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900',
      badge: 'Hospital Review',
      onClick: () => navigate('/referrals?status=pending')
    },
    {
      id: 'accepted',
      label: 'Accepted & Ready',
      value: summary?.acceptedCount ?? 0,
      icon: CheckCircle2,
      color: 'emerald',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
      badge: `${summary?.acceptanceRate ?? 100}% Rate`,
      onClick: () => navigate('/referrals?status=accepted')
    },
    {
      id: 'in-transit',
      label: 'In-Transit En Route',
      value: summary?.inTransitCount ?? 0,
      icon: Truck,
      color: 'purple',
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900',
      badge: 'Ambulance Dispatch',
      onClick: () => navigate('/tracking')
    },
    {
      id: 'attention',
      label: 'Requires Attention',
      value: summary?.rejectedCount ?? 0,
      icon: AlertTriangle,
      color: 'rose',
      iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900',
      badge: (summary?.rejectedCount ?? 0) > 0 ? 'Action Needed' : 'All Clear',
      onClick: () => navigate('/referrals?status=rejected')
    }
  ];

  return (
    <section
      aria-label="Health Centre operational metrics"
      className="space-y-2"
    >
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
          Operational Overview
        </span>
        <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Acceptance Rate: {summary?.acceptanceRate ?? 100}%</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className="group text-left bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-500 flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${card.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {card.badge}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {card.value}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {card.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default HealthCentreStats;
