import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';

export default function PatientDetailPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Management
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Patient Profile: {patientId}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Health centre medical record and care coordination history
          </p>
        </div>
      </div>

      <Card className="p-8 text-center text-slate-600 dark:text-slate-300">
        <p>Loading patient details for {patientId}...</p>
      </Card>
    </div>
  );
}
