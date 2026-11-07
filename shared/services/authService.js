import { apiClient } from './apiClient.js';
import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';

/**
 * CareConnect Ethiopia - Authentication & Session Service
 * High-level API client for authentication, session lifecycle, token renewal,
 * role-to-portal authorization mapping, and credential security.
 */

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'careconnect_access_token',
  REFRESH_TOKEN: 'careconnect_refresh_token',
  USER: 'careconnect_user',
  FACILITY: 'careconnect_facility'
};

/**
 * Perform user login with email and password
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} Backend response with user, tokens, and session info
 */
export async function login({ email, password }) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data || response;
}

/**
 * Refresh access token using existing refresh token
 * @param {string} [refreshToken] - Optional token if not reading from storage/cookie
 * @returns {Promise<Object>} New tokens and expiration info
 */
export async function refreshToken(refreshToken) {
  const token = refreshToken || getStoredRefreshToken();
  const response = await apiClient.post('/auth/refresh', { refreshToken: token });
  return response.data || response;
}

/**
 * Terminate active session and invalidate tokens on server
 * @param {string} [refreshToken] - Optional token to revoke
 * @returns {Promise<Object>} Confirmation message
 */
export async function logout(refreshToken) {
  const token = refreshToken || getStoredRefreshToken();
  try {
    const response = await apiClient.post('/auth/logout', { refreshToken: token });
    return response.data || response;
  } finally {
    clearSessionStorage();
  }
}

/**
 * Terminate all active sessions across all devices for current user
 * @returns {Promise<Object>}
 */
export async function logoutAll() {
  try {
    const response = await apiClient.post('/auth/logout-all');
    return response.data || response;
  } finally {
    clearSessionStorage();
  }
}

/**
 * Fetch authenticated user's current profile from backend
 * @returns {Promise<Object>} User details including facility and role
 */
export async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data?.user || response.data || response;
}

/**
 * Fetch authenticated user's RBAC permissions
 * @returns {Promise<Object>} Array of granted permission strings and role metadata
 */
export async function getUserPermissions() {
  const response = await apiClient.get('/auth/permissions');
  return response.data || response;
}

/**
 * Update authenticated user's password
 * @param {Object} payload - { currentPassword, newPassword }
 * @returns {Promise<Object>}
 */
export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword
  });
  return response.data || response;
}

/**
 * Request password reset token via email (anti-enumeration)
 * @param {string} email
 * @returns {Promise<Object>}
 */
export async function requestPasswordReset(email) {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data || response;
}

/**
 * Reset password using one-time verification token
 * @param {Object} payload - { token, newPassword }
 * @returns {Promise<Object>}
 */
export async function resetPassword({ token, newPassword }) {
  const response = await apiClient.post('/auth/reset-password', {
    token,
    newPassword
  });
  return response.data || response;
}

/**
 * List active user sessions
 * @returns {Promise<Array>}
 */
export async function getSessions() {
  const response = await apiClient.get('/auth/sessions');
  return response.data?.sessions || response.data || [];
}

/**
 * Revoke specific session by ID
 * @param {string|number} sessionId
 * @returns {Promise<Object>}
 */
export async function revokeSession(sessionId) {
  const response = await apiClient.delete(`/auth/sessions/${sessionId}`);
  return response.data || response;
}

// ============================================================================
// Storage & Session Persistence Helpers
// ============================================================================

export function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || localStorage.getItem('careconnect_token');
  } catch {
    return null;
  }
}

export function getStoredRefreshToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSessionStorage({ accessToken, refreshToken, user }) {
  if (typeof window === 'undefined') return;
  try {
    if (accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
  } catch (e) {
    console.warn('[CareConnect AuthService] Storage write error:', e);
  }
}

export function clearSessionStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('careconnect_token');
  } catch (e) {
    console.warn('[CareConnect AuthService] Storage clear error:', e);
  }
}

// ============================================================================
// Role & Portal Verification Utilities
// ============================================================================

/**
 * Check whether a given user role is permitted access to a specific portal
 * @param {string} role - User role identifier (e.g. 'HEALTH_CENTRE_REFERRAL_CLINICIAN')
 * @param {string} portalId - Portal id ('health-centre', 'hospital', 'transport', 'administrator')
 * @returns {boolean}
 */
export function isRoleAllowedForPortal(role, portalId) {
  if (!role) return false;

  // System Administrators and Regional Officers have cross-portal oversight
  if (role === ROLES.SYSTEM_ADMINISTRATOR || role === ROLES.REGIONAL_OFFICER) {
    return true;
  }

  // Lookup portal configuration
  const portalKey = Object.keys(PORTALS).find(
    key => PORTALS[key].id === portalId || PORTALS[key].key === portalId
  );
  if (!portalKey) return false;

  const allowedRoles = PORTALS[portalKey].allowedRoles || [];
  return allowedRoles.includes(role);
}

/**
 * Identify the primary assigned portal for a given user role
 * @param {string} role - User role
 * @returns {Object} Portal definition object
 */
export function getPortalForRole(role) {
  if (!role) return PORTALS.HEALTH_CENTRE;

  switch (role) {
    case ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN:
    case ROLES.PRIMARY_CARE_PHYSICIAN:
    case ROLES.CLINICAL_NURSE:
      return PORTALS.HEALTH_CENTRE;

    case ROLES.HOSPITAL_TRIAGE_CLINICIAN:
    case ROLES.EMERGENCY_PHYSICIAN:
    case ROLES.CHIEF_CLINICAL_OFFICER:
      return PORTALS.HOSPITAL;

    case ROLES.TRANSPORT_COORDINATOR:
    case ROLES.AMBULANCE_DISPATCHER:
    case ROLES.AMBULANCE_DRIVER:
      return PORTALS.TRANSPORT;

    case ROLES.SYSTEM_ADMINISTRATOR:
    case ROLES.REGIONAL_OFFICER:
    case ROLES.MOH_DATA_ANALYST:
      return PORTALS.ADMINISTRATOR;

    default:
      return PORTALS.HEALTH_CENTRE;
  }
}

/**
 * Get target localhost URL for portal in local development
 * @param {string} portalId
 * @returns {string} e.g. 'http://localhost:5173'
 */
export function getPortalUrl(portalId) {
  const portalKey = Object.keys(PORTALS).find(
    key => PORTALS[key].id === portalId || PORTALS[key].key === portalId
  );
  const portal = portalKey ? PORTALS[portalKey] : PORTALS.HEALTH_CENTRE;
  return `http://localhost:${portal.defaultPort}`;
}

export const authService = {
  login,
  refreshToken,
  logout,
  logoutAll,
  getCurrentUser,
  getUserPermissions,
  changePassword,
  requestPasswordReset,
  resetPassword,
  getSessions,
  revokeSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setSessionStorage,
  clearSessionStorage,
  isRoleAllowedForPortal,
  getPortalForRole,
  getPortalUrl,
  STORAGE_KEYS
};

export default authService;
