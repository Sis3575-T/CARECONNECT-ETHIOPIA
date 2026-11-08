import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { PatientRegistrationForm } from '../components/patients/PatientRegistrationForm.jsx';

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const facilityName = user?.facilityName || 'Assigned Health Centre';

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumb / Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Management
        </button>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40">
          Facility: {facilityName}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="p-3 rounded-2xl bg-sky-100/70 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/40">
          <UserPlus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Register New Patient
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create an official healthcare record under {facilityName}. Records are cryptographically protected and tenant-isolated.
          </p>
        </div>
      </div>

      {/* Registration Form Component */}
      <PatientRegistrationForm
        onSuccess={(registered) => {
          // Success handled in form view with direct link to profile
        }}
        onCancel={() => navigate('/patients')}
      />
    </div>
  );
}
