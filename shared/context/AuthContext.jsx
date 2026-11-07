import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ROLES } from '../constants/roles.js';
import { authService } from '../services/authService.js';

/**
 * Normalize user payload from backend or storage
 */
function normalizeUser(rawUser) {
  if (!rawUser) return null;
  const role = rawUser.role || rawUser.roleName || rawUser.role_name || 'HEALTH_CENTRE_REFERRAL_CLINICIAN';
  const name =
    rawUser.name ||
    [rawUser.firstName || rawUser.first_name, rawUser.lastName || rawUser.last_name].filter(Boolean).join(' ') ||
    rawUser.email ||
    'Healthcare Clinician';

  return {
    ...rawUser,
    role,
    roleName: role,
    name
  };
}

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
  login: async () => {},
  logout: async () => {},
  hasRole: () => false,
  hasPermission: () => false
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load initial session from storage
  useEffect(() => {
    try {
      const storedToken = authService.getStoredAccessToken();
      const storedUser = authService.getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(normalizeUser(storedUser));
      } else if (storedUser) {
        setUser(normalizeUser(storedUser));
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
      if (
        e.key === 'careconnect_access_token' ||
        e.key === 'careconnect_user' ||
        e.key === 'careconnect_token'
      ) {
        const updatedToken = authService.getStoredAccessToken();
        const updatedUser = authService.getStoredUser();

        if (!updatedToken && !updatedUser) {
          setToken(null);
          setUser(null);
        } else {
          setToken(updatedToken);
          setUser(normalizeUser(updatedUser));
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

  const login = useCallback(async (credentialsOrToken, maybeUser) => {
    try {
      // Form credentials pattern: login({ email, password, rememberMe })
      if (typeof credentialsOrToken === 'object' && credentialsOrToken !== null && credentialsOrToken.email) {
        const result = await authService.login(credentialsOrToken);
        const accessToken = result.accessToken || result.data?.accessToken;
        const rawUser = result.user || result.data?.user || { email: credentialsOrToken.email };
        const refreshToken = result.refreshToken || result.data?.refreshToken;
        const normalized = normalizeUser(rawUser);

        authService.setSessionStorage({ accessToken, refreshToken, user: normalized });
        setToken(accessToken);
        setUser(normalized);
        return { user: normalized, accessToken, refreshToken };
      }

      // Legacy direct token/user pattern: login(accessToken, userData)
      const accessToken = credentialsOrToken;
      const normalized = normalizeUser(maybeUser);
      authService.setSessionStorage({ accessToken, user: normalized });
      if (accessToken) setToken(accessToken);
      if (normalized) setUser(normalized);
      return { user: normalized, accessToken };
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Backend may be unreachable or session already expired
    } finally {
      authService.clearSessionStorage();
      setToken(null);
      setUser(null);
    }
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
