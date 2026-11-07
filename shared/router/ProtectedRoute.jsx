import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/feedback/Spinner.jsx';

/**
 * CareConnect Ethiopia - Protected Route Guard
 * Enforces server-authoritative authentication state.
 * Displays accessible loading indicator during initial session restoration.
 * If unauthenticated, safely redirects to /login preserving target location.
 */
export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Wait for initial session restoration before deciding to redirect
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center"
        role="status"
        aria-live="polite"
      >
        <Spinner size="lg" className="text-emerald-600 dark:text-emerald-400 mb-4" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Verifying healthcare credentials...
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          CareConnect Ethiopia • National Referral Network
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
