import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Flame,
  FileEdit
} from 'lucide-react';
import { Badge } from '@shared/components/display/Badge.jsx';
import { Skeleton } from '@shared/components/feedback/Skeleton.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

/**
 * Format elapsed time for SLA monitoring
 */
function formatElapsedHours(timestamp) {
  if (!timestamp) return '< 1h';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return '< 1h ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function PendingActionsSection({
  actions = { rejected: [], pendingTriage: [], inTransit: [], totalActionCount: 0 },
  loading = false
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5 space-y-4">
        <Skeleton width="220px" height="20px" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <Skeleton height="110px" className="rounded-xl" />
          <Skeleton height="110px" className="rounded-xl" />
          <Skeleton height="110px" className="rounded-xl" />
        </div>
      </div>
    );
  }

  const { rejected = [], pendingTriage = [], inTransit = [], totalActionCount = 0 } = actions;

  return (
    <section
      aria-label="Pending operational and clinical actions"
      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Clinician Action Center
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              totalActionCount > 0
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {totalActionCount} {totalActionCount === 1 ? 'Action' : 'Actions'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Prioritizes clinical decisions, rejections requiring correction, and emergency transports
        </p>
      </div>

      {totalActionCount === 0 ? (
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
              All Operational Tasks Up To Date
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              No rejected referrals requiring revision, delayed triage queues, or unconfirmed dispatches.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Rejected Referrals Requiring Revision */}
          <div className="rounded-xl border border-rose-200/90 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Requires Clinical Revision</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-[10px] font-extrabold">
                  {rejected.length}
                </span>
              </div>

              {rejected.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                  No rejections or corrections requested by receiving hospitals.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {rejected.slice(0, 2).map((r) => (
                    <div
                      key={r.id || r.reference_number}
                      className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-rose-100 dark:border-rose-900/40 text-xs"
                    >
                      <div className="flex justify-between items-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span>{r.reference_number || r.id}</span>
                        <span className="text-[10px] text-rose-600 font-semibold">Rejected</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-1 italic">
                        "{r.rejection_reason || r.notes || 'Capacity constraint at receiving facility'}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="xs"
              variant="outline"
              onClick={() => navigate('/referrals?status=rejected')}
              className="mt-3 w-full border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 justify-center"
            >
              <span>Review Rejections ({rejected.length})</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* 2. Referrals Awaiting Hospital Triage */}
          <div className="rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Awaiting Hospital Triage</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[10px] font-extrabold">
                  {pendingTriage.length}
                </span>
              </div>

              {pendingTriage.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                  All outgoing referrals have been triaged by hospitals.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {pendingTriage.slice(0, 2).map((r) => {
                    const priority = r.triage_priority || r.triagePriority || r.urgency || 'ROUTINE';
                    const isEmergency = String(priority).toUpperCase() === 'EMERGENCY';
                    return (
                      <div
                        key={r.id || r.reference_number}
                        className={`p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border text-xs ${
                          isEmergency
                            ? 'border-rose-200 dark:border-rose-900'
                            : 'border-amber-100 dark:border-amber-900/40'
                        }`}
                      >
                        <div className="flex justify-between items-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          <span>{r.reference_number || r.id}</span>
                          <span className="text-[10px] text-amber-600 font-semibold">
                            {formatElapsedHours(r.created_at || r.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{r.destination_facility_name || 'Receiving Hospital'}</span>
                          <Badge triage={priority} size="sm">
                            {priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              size="xs"
              variant="outline"
              onClick={() => navigate('/referrals?status=pending')}
              className="mt-3 w-full border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 justify-center"
            >
              <span>View Triage Queue ({pendingTriage.length})</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* 3. Active Ambulance Transfers En Route */}
          <div className="rounded-xl border border-purple-200/90 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400">
                  <Truck className="w-4 h-4 text-purple-600" />
                  <span>Ambulance Transfers En Route</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-[10px] font-extrabold">
                  {inTransit.length}
                </span>
              </div>

              {inTransit.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                  No ambulance transports currently en route from this facility.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {inTransit.slice(0, 2).map((r) => (
                    <div
                      key={r.id || r.reference_number}
                      className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/40 text-xs"
                    >
                      <div className="flex justify-between items-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span>{r.reference_number || r.id}</span>
                        <span className="text-[10px] text-purple-600 font-semibold">En Route</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                        Dest: {r.destination_facility_name || 'Hospital ED'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              size="xs"
              variant="outline"
              onClick={() => navigate('/tracking')}
              className="mt-3 w-full border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 justify-center"
            >
              <span>Track Dispatches ({inTransit.length})</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default PendingActionsSection;
