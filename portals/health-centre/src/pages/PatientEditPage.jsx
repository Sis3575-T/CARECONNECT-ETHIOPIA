import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@shared/components/ui/Button.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { patientService } from '../services/patientService.js';
import { PatientEditForm } from '../components/patients/PatientEditForm.jsx';
import { PatientDuplicateReviewSection } from '../components/patients/PatientDuplicateReviewSection.jsx';
import { PatientLoadingSkeleton } from '../components/patients/PatientLoadingSkeleton.jsx';
import { PatientErrorState } from '../components/patients/PatientErrorState.jsx';
import { formatPatientId } from '@shared/utils/formatters.js';

export default function PatientEditPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'duplicates'

  const loadPatient = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await patientService.getPatientById(patientId);
      setPatient(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        setError('Access Denied: You may only modify patient records registered under your health centre facility.');
      } else if (status === 404) {
        setError(`Patient record [${patientId}] not found.`);
      } else {
        setError(err?.message || 'Failed to load patient record for editing.');
      }
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  if (loading && !isRetrying) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate(`/patients/${encodeURIComponent(patientId)}`)}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Profile
        </button>
        <PatientLoadingSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate(`/patients/${encodeURIComponent(patientId)}`)}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Profile
        </button>
        <PatientErrorState
          title="Patient Modification Restricted"
          message={error}
          onRetry={() => loadPatient(true)}
          isRetrying={isRetrying}
        />
      </div>
    );
  }

  if (!patient) return null;

  const fullName = patient.full_name || `${patient.first_name} ${patient.father_name}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={() => navigate(`/patients/${encodeURIComponent(patient.id)}`)}
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile ({formatPatientId(patient.id)})
        </button>

        <div className="text-xs text-slate-500">
          Tenant Facility: <span className="font-semibold text-slate-800 dark:text-slate-200">{patient.registered_facility_name || user?.facilityName || 'Health Centre'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
            <Edit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Edit Patient Record: {fullName}
            </h1>
            <p className="text-xs font-mono text-sky-600 dark:text-sky-400 mt-0.5">
              Ref: {formatPatientId(patient.id)}
            </p>
          </div>
        </div>

        {/* Workspace Tab Switcher */}
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'edit'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Edit Demographics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'duplicates'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-300 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Duplicate Governance</span>
          </button>
        </div>
      </div>

      {activeTab === 'edit' ? (
        <PatientEditForm
          patient={patient}
          onSaveSuccess={(updated) => {
            setPatient(updated);
          }}
          onCancel={() => navigate(`/patients/${encodeURIComponent(patient.id)}`)}
        />
      ) : (
        <PatientDuplicateReviewSection
          patient={patient}
          onReviewCompleted={() => {
            loadPatient();
          }}
        />
      )}
    </div>
  );
}
