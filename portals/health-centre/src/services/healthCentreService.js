/**
 * CareConnect Ethiopia - Health Centre Portal Service
 * Handles operational API data fetching, metrics calculation,
 * and resilient communication for Health Centre clinicians and nurses.
 */

import { apiClient } from '../../../../shared/services/apiClient.js';

/**
 * Pure calculation of operational status tallies and rates from referrals list
 */
export function calculateOperationalMetrics(referrals = [], totalPatients = 0, unreadNotifications = 0) {
  let pendingCount = 0;
  let acceptedCount = 0;
  let inTransitCount = 0;
  let completedCount = 0;
  let rejectedCount = 0;
  let draftCount = 0;

  for (const ref of referrals) {
    const s = (ref?.status || '').toUpperCase();
    if (s === 'PENDING' || s === 'SUBMITTED' || s === 'ACKNOWLEDGED') {
      pendingCount++;
    } else if (s === 'ACCEPTED') {
      acceptedCount++;
    } else if (s === 'IN_TRANSIT' || s === 'DISPATCHED') {
      inTransitCount++;
    } else if (s === 'COMPLETED' || s === 'ARRIVED') {
      completedCount++;
    } else if (s === 'REJECTED') {
      rejectedCount++;
    } else if (s === 'DRAFT') {
      draftCount++;
    }
  }

  const activeReferrals = pendingCount + acceptedCount + inTransitCount;
  const closedTotal = completedCount + rejectedCount;
  const acceptanceRate = closedTotal > 0 ? Math.round((completedCount / closedTotal) * 100) : 100;

  return {
    totalPatients: Number(totalPatients) || 0,
    totalReferrals: referrals.length,
    activeReferrals,
    pendingCount,
    acceptedCount,
    inTransitCount,
    completedCount,
    rejectedCount,
    draftCount,
    acceptanceRate,
    unreadNotifications: Number(unreadNotifications) || 0,
    referrals
  };
}

export const healthCentreService = {
  /**
   * Fetch aggregate operational metrics for the Health Centre dashboard.
   * Leverages real backend referrals and patients API data.
   */
  async getDashboardSummary(facilityId) {
    try {
      const params = facilityId ? { originFacilityId: facilityId, limit: 100 } : { limit: 100 };

      // Fetch referrals, patients count, and unread notifications concurrently
      const [referralsRes, patientsRes, unreadRes] = await Promise.allSettled([
        apiClient.get('/referrals', { params }),
        apiClient.get('/patients', { params: { limit: 1 } }),
        apiClient.get('/notifications/unread-count')
      ]);

      const referrals = referralsRes.status === 'fulfilled' && referralsRes.value?.data?.data
        ? (Array.isArray(referralsRes.value.data.data) ? referralsRes.value.data.data : [])
        : [];

      const totalReferrals = referralsRes.status === 'fulfilled' && referralsRes.value?.data?.pagination?.total != null
        ? referralsRes.value.data.pagination.total
        : referrals.length;

      const totalPatients = patientsRes.status === 'fulfilled' && patientsRes.value?.data?.pagination?.total != null
        ? patientsRes.value.data.pagination.total
        : (patientsRes.status === 'fulfilled' && patientsRes.value?.data?.data?.length ? patientsRes.value.data.data.length : 0);

      const unreadNotifications = unreadRes.status === 'fulfilled' && unreadRes.value?.data?.data?.unread_count != null
        ? unreadRes.value.data.data.unread_count
        : 0;

      const metrics = calculateOperationalMetrics(referrals, totalPatients, unreadNotifications);
      metrics.totalReferrals = totalReferrals;
      return metrics;
    } catch (err) {
      console.error('[HealthCentreService] Failed to load dashboard summary:', err);
      return calculateOperationalMetrics([], 0, 0);
    }
  },

  /**
   * Fetch recent referrals list with pagination and optional status filter
   */
  async getRecentReferrals(params = {}) {
    const query = {
      limit: params.limit || 10,
      page: params.page || 1,
      status: params.status || undefined,
      priority: params.priority || undefined,
      originFacilityId: params.facilityId || undefined
    };

    // Clean undefined keys
    Object.keys(query).forEach((k) => query[k] === undefined && delete query[k]);

    const res = await apiClient.get('/referrals', { params: query });
    const items = res.data?.data || [];
    const pagination = res.data?.pagination || { page: 1, limit: 10, total: items.length };

    return {
      items: Array.isArray(items) ? items : [],
      pagination
    };
  },

  /**
   * Fetch pending operational actions requiring clinician attention
   */
  async getPendingActions(facilityId) {
    const summary = await this.getDashboardSummary(facilityId);
    const referrals = summary.referrals || [];

    const rejected = referrals.filter(r => (r.status || '').toUpperCase() === 'REJECTED');
    const pendingTriage = referrals.filter(r => {
      const s = (r.status || '').toUpperCase();
      return s === 'SUBMITTED' || s === 'PENDING' || s === 'ACKNOWLEDGED';
    });
    const inTransit = referrals.filter(r => {
      const s = (r.status || '').toUpperCase();
      return s === 'IN_TRANSIT' || s === 'DISPATCHED';
    });

    return {
      rejected,
      pendingTriage,
      inTransit,
      totalActionCount: rejected.length + pendingTriage.length + inTransit.length
    };
  },

  /**
   * Fetch notification list for health centre staff
   */
  async getNotifications(limit = 5) {
    try {
      const res = await apiClient.get('/notifications', { params: { limit } });
      return res.data?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    return apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * Fetch facility information by ID
   */
  async getFacility(facilityId) {
    if (!facilityId) return null;
    try {
      const res = await apiClient.get(`/facilities/${facilityId}`);
      return res.data?.data || res.data?.facility || null;
    } catch {
      return null;
    }
  }
};
