import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bed, Plus, Search, Filter, RotateCcw } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { hospitalService, calculateAdmissionMetrics } from '../services/hospitalService.js';
import { AdmissionStatusBadge } from '../components/admission/AdmissionStatusBadge.jsx';
import { AdmissionSkeleton } from '../components/admission/AdmissionSkeleton.jsx';
import { AdmissionEmptyState } from '../components/admission/AdmissionEmptyState.jsx';

/**
 * CareConnect Ethiopia - Hospital Inpatient Admissions Workspace
 * Foundation architecture for hospital patient admission tracking,
 * department assignments, care progress, and referral completion.
 */
export default function AdmissionsWorkspacePage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadAdmissions() {
      setLoading(true);
      setError(null);
      try {
        const res = await hospitalService.getAdmissionsQueue();
        if (isMounted) {
          setReferrals(res.referrals || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data?.message || err.message || 'Failed to load admissions');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAdmissions();
    return () => { isMounted = false; };
  }, [user?.facilityId]);

  const metrics = calculateAdmissionMetrics(referrals);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bed className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Inpatient Admission & Care Tracking</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor admitted referrals, department assignments, clinical care progress and referral completion.
          </p>
        </div>
      </div>

      {loading ? (
        <AdmissionSkeleton count={4} />
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-center text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      ) : referrals.length === 0 ? (
        <AdmissionEmptyState />
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {referrals.map((ref) => (
            <div key={ref.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                  {ref.reference_number || ref.id}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {ref.patient_name || 'Patient'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <AdmissionStatusBadge status={ref.status} />
                <Link
                  to={`/admissions/${ref.id}`}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
