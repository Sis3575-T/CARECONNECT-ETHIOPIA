/**
 * CareConnect Ethiopia - Portal Route Definitions
 * Centralizes route paths for all four portals, shared authentication, and error screens.
 */

export const SHARED_ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/not-found',
  SETTINGS: '/settings'
};

export const HEALTH_CENTRE_ROUTES = {
  ROOT: '/',
  DASHBOARD: '/',
  PATIENTS: '/patients',
  CREATE_REFERRAL: '/create-referral',
  REFERRALS: '/referrals',
  AI_REVIEW: '/ai-review',
  HOSPITALS: '/hospitals',
  TRACKING: '/tracking',
  REPORTS: '/reports',
  AI_ASSISTANT: '/ai-assistant',
  SETTINGS: '/settings'
};

export const HOSPITAL_ROUTES = {
  ROOT: '/',
  DASHBOARD: '/',
  INCOMING: '/incoming',
  PENDING_TRIAGE: '/pending',
  ACCEPTED: '/accepted',
  REJECTED: '/rejected',
  ADMISSIONS: '/arrivals',
  SERVICES: '/services',
  CAPACITY: '/capacity',
  FEEDBACK: '/feedback',
  REPORTS: '/reports',
  SETTINGS: '/settings'
};

export const TRANSPORT_ROUTES = {
  ROOT: '/',
  DASHBOARD: '/',
  REQUESTS: '/requests',
  IN_TRANSIT: '/in-transit',
  MAP: '/map',
  FLEET: '/resources',
  REPORTS: '/reports',
  SETTINGS: '/settings'
};

export const ADMIN_ROUTES = {
  ROOT: '/',
  DASHBOARD: '/',
  USERS: '/users',
  ROLES: '/roles',
  FACILITIES: '/facilities',
  CAPACITY: '/capacity-monitoring',
  REFERRALS: '/referrals',
  AI_MANAGEMENT: '/ai-management',
  AI_PERFORMANCE: '/ai-performance',
  ANALYTICS: '/analytics',
  AUDIT_LOGS: '/audit-logs',
  SETTINGS: '/settings'
};
