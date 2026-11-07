import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ROLES } from '../constants/roles.js';

/**
 * CareConnect Ethiopia - Authentication & User Context
 * Centralizes authentication state, user session, RBAC checks,
 * multi-tab synchronization, and graceful session expiration handling.
 */

export const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: () => {},
  logout: () => {},
  hasRole: () => false,
  hasPermission: () => false
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load initial session from localStorage
  useEffect(() => {
    try {
      const storedToken =
        localStorage.getItem('careconnect_access_token') ||
        localStorage.getItem('careconnect_token');
      const storedUser = localStorage.getItem('careconnect_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else if (storedUser) {
        // Demo mode without token
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.warn('[CareConnect Auth] Failed to restore session from storage:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Synchronize across browser tabs via storage events
  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === 'careconnect_access_token' || e.key === 'careconnect_user') {
        const updatedToken = localStorage.getItem('careconnect_access_token') || localStorage.getItem('careconnect_token');
        const updatedUser = localStorage.getItem('careconnect_user');

        if (!updatedToken && !updatedUser) {
          setToken(null);
          setUser(null);
        } else {
          setToken(updatedToken);
          setUser(updatedUser ? JSON.parse(updatedUser) : null);
        }
      }
    }

    // Listen for session expiration events from apiClient
    function handleSessionExpired() {
      logout();
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('careconnect:session_expired', handleSessionExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('careconnect:session_expired', handleSessionExpired);
    };
  }, []);

  const login = useCallback((accessToken, userData) => {
    try {
      if (accessToken) {
        localStorage.setItem('careconnect_access_token', accessToken);
        setToken(accessToken);
      }
      if (userData) {
        localStorage.setItem('careconnect_user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (e) {
      console.warn('[CareConnect Auth] Failed to save session:', e);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('careconnect_access_token');
      localStorage.removeItem('careconnect_token');
      localStorage.removeItem('careconnect_user');
    } catch {
      // Storage unavailable
    }
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    // Admins have all-role oversight
    if (user.role === ROLES.SYSTEM_ADMINISTRATOR || user.role === ROLES.REGIONAL_OFFICER) {
      return true;
    }
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  }, [user]);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.role === ROLES.SYSTEM_ADMINISTRATOR) return true;
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(permission);
    }
    return false;
  }, [user]);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token || user),
    loading,
    login,
    logout,
    hasRole,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
