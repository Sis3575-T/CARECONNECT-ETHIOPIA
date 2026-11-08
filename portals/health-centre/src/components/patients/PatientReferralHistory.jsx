import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Calendar, Building2, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';
import { Badge } from '@shared/components/display/Badge.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { formatClinicalDate } from '@shared/utils/formatters.js';

export function PatientReferralHistory({ referrals = [], patientId }) {
  const navigate = useNavigate();

  const getPriorityBadge = (priority) => {
    const p = String(priority || '').toUpperCase();
    switch (p) {
      case 'STAT':
      case 'EMERGENCY':
        return <Badge variant="danger">Emergency (STAT)</Badge>;
      case 'URGENT':
        return <Badge variant="warning">Urgent</Badge>;
      default:
        return <Badge variant="neutral">Routine</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'PENDING':
      case 'SUBMITTED':
        return <Badge variant="warning">Pending Triage</Badge>;
      case 'ACCEPTED':
        return <Badge variant="success">Accepted</Badge>;
      case 'IN_TRANSIT':
      case 'DISPATCHED':
        return <Badge variant="info">In Transit</Badge>;
      case 'ARRIVED':
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Care Coordination & Referral History ({referrals.length})
          </h3>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/create-referral?patientId=${encodeURIComponent(patientId)}`)}
          className="text-xs inline-flex items-center gap-1.5"
        >
          <span>Initiate Referral</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {referrals.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No external hospital referrals have been created for this patient yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-2.5">Referral ID</th>
                <th className="px-4 py-2.5">Destination Hospital</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Date Created</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {referrals.map((ref) => (
                <tr key={ref.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">
                    {ref.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {ref.destination_facility_name || ref.destinationFacilityName || ref.destination_facility_id || 'Hospital'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getPriorityBadge(ref.priority)}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(ref.status)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatClinicalDate(ref.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => navigate(`/referrals?search=${encodeURIComponent(ref.id)}`)}
                      className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                    >
                      Track
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default PatientReferralHistory;
