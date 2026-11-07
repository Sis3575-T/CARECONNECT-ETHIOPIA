import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * CareConnect Ethiopia - Role-Based Route Guard
 * Verifies authenticated user holds one of the required portal roles.
 * Redirects unauthorized users to /unauthorized.
 */
export function RoleRoute({ children, allowedRoles = [] }) {
  const location = useLocation();

  const getUser = () => {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem('careconnect_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUser();

  // If no specific role restriction, permit
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // System Administrator always has oversight access
  if (user && (user.role === 'SYSTEM_ADMINISTRATOR' || user.role === 'REGIONAL_OFFICER')) {
    return children;
  }

  // Check if user has one of allowed roles
  const hasRole = user && allowedRoles.includes(user.role);

  if (!hasRole && user) {
    return <Navigate to="/unauthorized" state={{ from: location, requiredRoles: allowedRoles }} replace />;
  }

  return children;
}

export default RoleRoute;
