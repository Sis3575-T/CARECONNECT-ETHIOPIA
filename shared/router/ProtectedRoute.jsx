import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * CareConnect Ethiopia - Protected Route Guard
 * Checks if user is authenticated (valid token or user session in storage).
 * If unauthenticated, safely redirects to /login with state preservation.
 */
export function ProtectedRoute({ children }) {
  const location = useLocation();

  const isAuthenticated = () => {
    if (typeof window === 'undefined') return true;
    try {
      const token = localStorage.getItem('careconnect_access_token') || localStorage.getItem('careconnect_token');
      const user = localStorage.getItem('careconnect_user');
      return Boolean(token || user);
    } catch {
      return false;
    }
  };

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
