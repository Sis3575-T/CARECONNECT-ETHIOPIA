import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/feedback/Spinner.jsx';

/**
 * CareConnect Ethiopia - Role-Based Route Guard
 * Enforces server-authoritative RBAC constraints.
 * Redirects unauthenticated users to /login and unauthorized users to /unauthorized.
 */
export function RoleRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const { user, isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center"
        role="status"
        aria-live="polite"
      >
        <Spinner size="lg" className="text-emerald-600 dark:text-emerald-400 mb-4" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Verifying portal permissions...
        </p>
      </div>
    );
  }

  // If not signed in, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles required, check against authenticated user
  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = hasRole(allowedRoles);
    if (!isAllowed) {
      return (
        <Navigate
          to="/unauthorized"
          state={{ from: location, requiredRoles: allowedRoles }}
          replace
        />
      );
    }
  }

  return children;
}

export default RoleRoute;
