import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  Eye,
  Clock,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@shared/components/display/Badge.jsx';
import { EmptyState } from '@shared/components/display/EmptyState.jsx';
import { Skeleton } from '@shared/components/feedback/Skeleton.jsx';
import { Button } from '@shared/components/ui/Button.jsx';

/**
 * Mask patient name or MRN to preserve privacy on dashboard summary view
 */
function maskPatientIdentifier(referral) {
  if (referral.patient_mrn) {
    const mrn = String(referral.patient_mrn);
    return mrn.length > 4 ? `MRN-***${mrn.slice(-4)}` : `MRN-${mrn}`;
  }
  if (referral.patientName || referral.patient_name) {
    const raw = referral.patientName || referral.patient_name;
    const parts = raw.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0];
  }
  if (referral.patient_id || referral.patientId) {
    const pid = String(referral.patient_id || referral.patientId);
    return `PID-${pid.slice(0, 6)}...`;
  }
  return 'Patient #Confidential';
}

/**
 * Format timestamp to relative or localized string
 */
function formatReferralDate(timestamp) {
  if (!timestamp) return 'Recently';
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Recently';
  }
}

/**
 * Resolve status badge variant and label
 */
function getStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'ACCEPTED':
      return { variant: 'success', label: 'Accepted' };
    case 'IN_TRANSIT':
    case 'DISPATCHED':
      return { variant: 'purple', label: 'In Transit' };
    case 'REJECTED':
      return { variant: 'error', label: 'Requires Revision' };
    case 'COMPLETED':
    case 'ARRIVED':
      return { variant: 'neutral', label: 'Completed' };
    case 'DRAFT':
      return { variant: 'neutral', label: 'Draft' };
    case 'SUBMITTED':
    case 'PENDING':
    case 'ACKNOWLEDGED':
    default:
      return { variant: 'warning', label: 'Awaiting Triage' };
  }
}

export function RecentReferralsTable({
  referrals = [],
  loading = false,
  totalCount = 0
}) {
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState('ALL');

  // Filter referrals based on selected tab
  const filteredReferrals = referrals.filter((ref) => {
    const s = String(ref.status || '').toUpperCase();
    if (filterTab === 'PENDING') {
      return s === 'PENDING' || s === 'SUBMITTED' || s === 'ACKNOWLEDGED';
    }
    if (filterTab === 'ACCEPTED') {
      return s === 'ACCEPTED';
    }
    if (filterTab === 'IN_TRANSIT') {
      return s === 'IN_TRANSIT' || s === 'DISPATCHED';
    }
    if (filterTab === 'REJECTED') {
      return s === 'REJECTED';
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
      {/* Table Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Recent Electronic Referrals
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-semibold">
              {referrals.length} active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Privacy-preserving tracking of outgoing referrals from this facility
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick tab filters */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterTab === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('PENDING')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterTab === 'PENDING'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'hover:text-amber-600'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('ACCEPTED')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterTab === 'ACCEPTED'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'hover:text-emerald-600'
              }`}
            >
              Accepted
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('IN_TRANSIT')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                filterTab === 'IN_TRANSIT'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'hover:text-purple-600'
              }`}
            >
              In Transit
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/referrals')}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer pl-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-3 py-2" role="status" aria-label="Loading referrals table">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800">
              <Skeleton width="120px" height="16px" />
              <Skeleton width="90px" height="16px" />
              <Skeleton width="130px" height="16px" />
              <Skeleton width="70px" height="20px" />
              <Skeleton width="80px" height="20px" />
              <Skeleton width="60px" height="28px" />
            </div>
          ))}
        </div>
      ) : filteredReferrals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No referrals match this filter"
          description="There are currently no active electronic referrals recorded under this criteria."
          actionLabel="Create Referral"
          onAction={() => navigate('/create-referral')}
          className="my-3 py-8"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Recent electronic referrals">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th scope="col" className="py-2.5 px-3">Referral Reference</th>
                <th scope="col" className="py-2.5 px-3">Patient</th>
                <th scope="col" className="py-2.5 px-3">Receiving Hospital</th>
                <th scope="col" className="py-2.5 px-3">Service</th>
                <th scope="col" className="py-2.5 px-3">Triage Urgency</th>
                <th scope="col" className="py-2.5 px-3">Current Status</th>
                <th scope="col" className="py-2.5 px-3">Submitted</th>
                <th scope="col" className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredReferrals.map((r) => {
                const refCode = r.reference_number || r.referenceNumber || r.id || 'REF-ET-000';
                const statusMeta = getStatusBadge(r.status);
                const triagePriority = r.triage_priority || r.triagePriority || r.urgency || 'ROUTINE';
                const destination = r.destination_facility_name || r.receivingFacility || r.destinationFacility || 'Specialized Hospital';
                const service = r.service_requested || r.service || r.department || 'General Referral';
                const patientDisplay = maskPatientIdentifier(r);
                const dateDisplay = formatReferralDate(r.created_at || r.createdAt);

                return (
                  <tr
                    key={r.id || refCode}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {refCode}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {patientDisplay}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {destination}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {service}
                    </td>
                    <td className="py-3 px-3">
                      <Badge triage={triagePriority} size="sm" dot>
                        {triagePriority}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={statusMeta.variant} size="sm">
                        {statusMeta.label}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {dateDisplay}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => navigate(`/tracking?ref=${encodeURIComponent(refCode)}`)}
                        className="font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100"
                      >
                        <span>Track</span>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RecentReferralsTable;
