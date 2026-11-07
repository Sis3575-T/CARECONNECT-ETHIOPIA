import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

/**
 * CareConnect Ethiopia - Reusable Accessible 404 Not Found Page
 */
export function NotFoundPage({ portalName = 'CareConnect' }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-6 shadow-sm">
        <FileQuestion className="w-8 h-8 stroke-[1.5]" />
      </div>

      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">
        Error 404
      </span>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
        Clinical Page Not Found
      </h1>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        The requested healthcare portal resource, patient referral, or operational view could not be located.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>

        <Button
          variant="primary"
          leftIcon={<Home className="w-4 h-4" />}
          onClick={() => navigate('/')}
        >
          Dashboard
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;
