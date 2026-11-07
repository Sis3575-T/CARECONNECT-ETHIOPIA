import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

/**
 * CareConnect Ethiopia - Reusable Accessible 403 Unauthorized Page
 */
export function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const requiredRoles = location.state?.requiredRoles || [];

  const handleLogout = () => {
    try {
      localStorage.removeItem('careconnect_access_token');
      localStorage.removeItem('careconnect_user');
      localStorage.removeItem('careconnect_token');
    } catch {
      // ignore
    }
    navigate('/login');
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-500 mb-6 shadow-sm">
        <ShieldAlert className="w-8 h-8 stroke-[1.75]" />
      </div>

      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">
        Access Restricted (403)
      </span>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
        Clinical Authorization Required
      </h1>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
        Your authenticated user profile does not possess the requisite clinical permissions or facility credentials to inspect this section.
      </p>

      {requiredRoles.length > 0 && (
        <div className="mb-8 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 max-w-sm">
          <span className="font-bold block mb-1">Permitted Roles:</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {requiredRoles.map(role => (
              <span key={role} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-semibold text-[11px]">
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/')}
        >
          Return to Portal
        </Button>

        <Button
          variant="destructive"
          leftIcon={<LogOut className="w-4 h-4" />}
          onClick={handleLogout}
        >
          Sign In as Different User
        </Button>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
