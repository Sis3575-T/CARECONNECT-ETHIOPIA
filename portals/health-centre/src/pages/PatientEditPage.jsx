import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { Card } from '@shared/components/display/Card.jsx';

export default function PatientEditPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="inline-flex items-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Patient Profile
        </button>
      </div>

      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
          <Edit className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Edit Patient Record: {patientId}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit demographic corrections or review duplicate records
          </p>
        </div>
      </div>

      <Card className="p-8 text-center text-slate-600 dark:text-slate-300">
        <p>Edit interface for {patientId} initializing...</p>
      </Card>
    </div>
  );
}
