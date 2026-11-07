import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building, ShieldCheck, AlertTriangle, ExternalLink, LogOut } from 'lucide-react';
import { LoginForm } from '@shared/components/forms/LoginForm.jsx';
import { Alert } from '@shared/components/feedback/Alert.jsx';
import { Button } from '@shared/components/ui/Button.jsx';
import { useAuth } from '@shared/context/AuthContext.jsx';
import { isRoleAllowedForPortal, getPortalForRole, getPortalUrl } from '@shared/services/authService.js';
import { ROLE_LABELS } from '@shared/constants/roles.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();

  const [serverError, setServerError] = useState(null);
  const [roleMismatch, setRoleMismatch] = useState(null);

  const demoAccounts = [
    {
      label: 'Dr. Alemayehu Bekele',
      email: 'dr.alemayehu@careconnect.gov.et',
      role: 'Health Centre Clinician'
    },
    {
      label: 'Sr. Tigist Haile',
      email: 'tigist.haile@careconnect.gov.et',
      role: 'Clinical Nurse'
    }
  ];

  const handleLoginSubmit = async ({ email, password, rememberMe }) => {
    setServerError(null);
    setRoleMismatch(null);

    try {
      const { user } = await login({ email, password, rememberMe });
      const userRole = user.roleName || user.role;

      // Server-Authoritative Role Check for this Portal
      if (!isRoleAllowedForPortal(userRole, 'health-centre')) {
        const assignedPortal = getPortalForRole(userRole);
        setRoleMismatch({
          user,
          userRole,
          assignedPortal
        });
        return;
      }

      // Authorized: Redirect to requested destination or dashboard root
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      const errorMsg =
        err.message ||
        err.response?.data?.message ||
        'Unable to authenticate with health centre credentials.';
      setServerError(errorMsg);
    }
  };

  const handleSwitchPortal = () => {
    if (roleMismatch?.assignedPortal) {
      window.location.href = getPortalUrl(roleMismatch.assignedPortal.id);
    }
  };

  const handleSignOutAndReset = async () => {
    await logout();
    setRoleMismatch(null);
    setServerError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-sky-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-700 p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0284c7] to-[#0ea5e9] flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <Building className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            CareConnect Ethiopia
          </h1>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest mt-0.5">
            Health Centre Referral Portal
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs">
            Sign in to create, track, and coordinate primary patient referrals across Ethiopian healthcare networks.
          </p>
        </div>

        {/* Role Mismatch Notice if user authenticated with credentials for a different portal */}
        {roleMismatch ? (
          <div className="space-y-4">
            <Alert
              variant="warning"
              title="Portal Role Mismatch"
              description={`You have authenticated as ${
                ROLE_LABELS[roleMismatch.userRole] || roleMismatch.userRole
              }. This account is authorized for the ${
                roleMismatch.assignedPortal.name
              }, not the Health Centre Portal.`}
            />
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Access Restricted (No Privilege Escalation)
              </div>
              <p>
                In compliance with Ethiopian National Healthcare Security Regulations, your role cannot access primary health centre intake.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="primary"
                onClick={handleSwitchPortal}
                className="w-full justify-center bg-sky-600 hover:bg-sky-700"
                rightIcon={<ExternalLink className="w-4 h-4" />}
              >
                Go to {roleMismatch.assignedPortal.name}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOutAndReset}
                className="w-full justify-center"
                leftIcon={<LogOut className="w-4 h-4" />}
              >
                Sign Out & Try Another Account
              </Button>
            </div>
          </div>
        ) : (
          <LoginForm
            portalId="health-centre"
            portalTitle="Health Centre Portal"
            initialEmail="dr.alemayehu@careconnect.gov.et"
            onSubmit={handleLoginSubmit}
            serverError={serverError}
            onClearServerError={() => setServerError(null)}
            accent="sky"
            demoAccounts={demoAccounts}
          />
        )}

        {/* MoH Security Notice */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/80 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Federal Ministry of Health • Official Healthcare Infrastructure
          </p>
        </div>
      </div>
    </div>
  );
}
