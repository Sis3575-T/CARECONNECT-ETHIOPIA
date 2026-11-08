import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  User,
  GitBranch,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { Card } from '@shared/components/display/Card.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { patientService } from '../services/patientService.js';
import { PatientOverviewCard } from '../components/patients/PatientOverviewCard.jsx';
import { PatientReferralHistory } from '../components/patients/PatientReferralHistory.jsx';
import { PatientAuditHistory } from '../components/patients/PatientAuditHistory.jsx';
import { PatientLoadingSkeleton } from '../components/patients/PatientLoadingSkeleton.jsx';
import { PatientErrorState } from '../components/patients/PatientErrorState.jsx';
import { formatPatientId } from '@shared/utils/formatters.js';

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [history, setHistory] = useState({ corrections: [], duplicate_reviews: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadPatientData = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Concurrently fetch patient demographics, referrals, and corrections audit history
      const [patData, refData, histData] = await Promise.all([
        patientService.getPatientById(patientId),
        patientService.getPatientReferrals(patientId),
        patientService.getPatientHistory(patientId).catch(() => ({ corrections: [], duplicate_reviews: [] }))
      ]);

      setPatient(patData);
      setReferrals(refData || []);
      setHistory(histData || { corrections: [], duplicate_reviews: [] });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('Access Denied: This patient is registered under a different healthcare facility. Health centre clinicians may only access records within their authorized tenancy.');
      } else if (status === 404) {
        setError(`Patient record [${patientId}] does not exist or has been permanently archived.`);
      } else {
        setError(err?.message || 'Failed to load patient record details. Please check network connection.');
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatientData();
  }, [loadPatientData]);

  if (loading && !isRetrying) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Management
        </button>
        <PatientLoadingSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Management
        </button>
        <PatientErrorState
          title="Patient Record Unavailable"
          message={error}
          onRetry={() => loadPatientData(true)}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  if (!patient) return null;

  const fullName = patient.full_name || `${patient.first_name || ''} ${patient.father_name || ''}`.trim() || 'Patient';

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Management
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPatientData(true)}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/patients/${encodeURIComponent(patient.id)}/edit`)}
            className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Record</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/create-referral?patientId=${encodeURIComponent(patient.id)}`)}
            className="inline-flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Initiate Referral</span>
          </Button>
        </div>
      </div>

      {/* Main Demographics & Contact Card */}
      <PatientOverviewCard patient={patient} />

      {/* Care Coordination & Referral History */}
      <PatientReferralHistory
        referrals={referrals}
        patientId={patient.id}
      />

      {/* Clinical Governance & Audit History */}
      <PatientAuditHistory
        corrections={history.corrections || []}
        duplicateReviews={history.duplicate_reviews || []}
      />
    </div>
  );
}
