import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, ExternalLink, Building } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../constants/roles.js';
import { getPortalForRole, getPortalUrl } from '../services/authService.js';

/**
 * CareConnect Ethiopia - Reusable Accessible 403 Unauthorized Page
 */
export function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const requiredRoles = location.state?.requiredRoles || [];

  const userRole = user?.roleName || user?.role;
  const assignedPortal = userRole ? getPortalForRole(userRole) : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoToAssignedPortal = () => {
    if (assignedPortal) {
      window.location.href = getPortalUrl(assignedPortal.id);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-8">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-500 mb-6 shadow-sm">
        <ShieldAlert className="w-8 h-8 stroke-[1.75]" />
      </div>

      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">
        Access Restricted (403 Forbidden)
      </span>

      <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
        Clinical Authorization Required
      </h1>

      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
        Your authenticated user profile does not possess the requisite clinical permissions or facility credentials to inspect this section.
      </p>

      {/* User Context Details */}
      {user && (
        <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 max-w-sm w-full text-left">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80 dark:border-slate-700/80">
            <span className="text-slate-400 font-medium">Signed in as</span>
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
              {user.name || user.email}
            </span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-400 font-medium">Assigned Role</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {ROLE_LABELS[userRole] || userRole || 'Unassigned'}
            </span>
          </div>
          {user.facilityId && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 font-medium">Facility ID</span>
              <span className="font-medium text-slate-600 dark:text-slate-400">
                Facility #{user.facilityId}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Required Roles Matrix */}
      {requiredRoles.length > 0 && (
        <div className="mb-6 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 max-w-sm">
          <span className="font-bold block mb-1">Authorized Roles for this Section:</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {requiredRoles.map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 font-semibold text-[11px]"
              >
                {ROLE_LABELS[role] || role}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate('/')}
        >
          Return to Portal
        </Button>

        {assignedPortal && (
          <Button
            variant="primary"
            rightIcon={<ExternalLink className="w-4 h-4" />}
            onClick={handleGoToAssignedPortal}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Go to {assignedPortal.name}
          </Button>
        )}

        <Button
          variant="destructive"
          leftIcon={<LogOut className="w-4 h-4" />}
          onClick={handleLogout}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
