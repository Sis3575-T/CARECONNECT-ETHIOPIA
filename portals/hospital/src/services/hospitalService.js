/**
 * CareConnect Ethiopia - Hospital Portal Service Gateway
 * Connects the Hospital Portal to centralized backend endpoints.
 * Enforces facility tenancy isolation, authorized staff context,
 * and resilient operational data calculation.
 */

import { apiClient } from '../../../../shared/services/apiClient.js';

/**
 * Pure calculation of hospital operational status tallies and triage rates from referrals list
 */
export function calculateHospitalOperationalMetrics(referrals = [], unreadNotifications = 0) {
  let pendingTriageCount = 0;
  let inReviewCount = 0;
  let acceptedCount = 0;
  let rejectedCount = 0;
  let infoRequestedCount = 0;
  let inTransitCount = 0;
  let arrivedCount = 0;
  let completedCount = 0;
  let emergencyCount = 0;
  let urgentCount = 0;

  for (const ref of referrals) {
    const s = (ref?.status || '').toUpperCase();
    const p = (ref?.priority || '').toUpperCase();

    if (p === 'EMERGENCY') emergencyCount++;
    if (p === 'URGENT') urgentCount++;

    if (s === 'SUBMITTED' || s === 'PENDING') {
      pendingTriageCount++;
    } else if (s === 'ACKNOWLEDGED' || s === 'IN_REVIEW') {
      inReviewCount++;
    } else if (s === 'ACCEPTED') {
      acceptedCount++;
    } else if (s === 'REJECTED') {
      rejectedCount++;
    } else if (s === 'INFO_REQUESTED') {
      infoRequestedCount++;
    } else if (s === 'IN_TRANSIT' || s === 'DISPATCHED' || s === 'TRANSFERRED') {
      inTransitCount++;
    } else if (s === 'ARRIVED') {
      arrivedCount++;
    } else if (s === 'COMPLETED') {
      completedCount++;
    }
  }

  // Active cases under hospital coordination or pending review
  const activeCases = pendingTriageCount + inReviewCount + acceptedCount + inTransitCount;
  const totalDecided = acceptedCount + rejectedCount;
  const acceptanceRate = totalDecided > 0 ? Math.round((acceptedCount / totalDecided) * 100) : 100;

  return {
    totalIncoming: referrals.length,
    pendingTriageCount,
    inReviewCount,
    acceptedCount,
    rejectedCount,
    infoRequestedCount,
    inTransitCount,
    arrivedCount,
    completedCount,
    activeCases,
    emergencyCount,
    urgentCount,
    acceptanceRate,
    unreadNotifications: Number(unreadNotifications) || 0,
    referrals
  };
}

export const hospitalService = {
  /**
   * Fetch hospital facility profile details by facility ID
   */
  async getHospitalProfile(facilityId) {
    if (!facilityId) return null;
    try {
      const res = await apiClient.get(`/facilities/${facilityId}`);
      return res.data?.data || res.data || null;
    } catch (err) {
      console.warn('[HospitalService] Failed to fetch hospital profile:', err?.message);
      return null;
    }
  },

  /**
   * Fetch aggregate operational metrics for hospital dashboard
   */
  async getDashboardSummary() {
    try {
      const [referralsRes, unreadRes] = await Promise.allSettled([
        apiClient.get('/referrals/incoming', { params: { limit: 100 } }),
        apiClient.get('/notifications/unread-count')
      ]);

      let referrals = [];
      let totalIncoming = 0;

      if (referralsRes.status === 'fulfilled') {
        const payload = referralsRes.value?.data;
        referrals = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.referrals)
          ? payload.referrals
          : [];
        totalIncoming = payload?.pagination?.total ?? referrals.length;
      }

      const unreadNotifications = unreadRes.status === 'fulfilled' && unreadRes.value?.data?.data?.unread_count != null
        ? unreadRes.value.data.data.unread_count
        : 0;

      const metrics = calculateHospitalOperationalMetrics(referrals, unreadNotifications);
      metrics.totalIncoming = totalIncoming;
      return metrics;
    } catch (err) {
      console.error('[HospitalService] Failed to load dashboard summary:', err);
      return calculateHospitalOperationalMetrics([], 0);
    }
  },

  /**
   * Retrieve incoming hospital referrals queue with search, filter, and pagination
   */
  async getIncomingReferrals(params = {}) {
    try {
      const res = await apiClient.get('/referrals/incoming', { params });
      const payload = res.data || {};
      const items = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.referrals)
        ? payload.referrals
        : [];
      return {
        referrals: items,
        total: payload.pagination?.total ?? payload.total ?? items.length,
        page: payload.pagination?.page ?? params.page ?? 1,
        limit: payload.pagination?.limit ?? params.limit ?? 20
      };
    } catch (err) {
      console.error('[HospitalService] Failed to load incoming referrals:', err);
      throw err;
    }
  },

  /**
   * Fetch single referral record by UUID or reference number
   */
  async getReferralById(referralId) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.get(`/referrals/${referralId}`);
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Fetch full chronological audit timeline of referral transitions and events
   */
  async getReferralTimeline(referralId) {
    if (!referralId) return [];
    try {
      const res = await apiClient.get(`/referrals/${referralId}/timeline`);
      return res.data?.data?.timeline || res.data?.data || [];
    } catch (err) {
      console.warn('[HospitalService] Timeline endpoint fallback:', err?.message);
      return [];
    }
  },

  /**
   * Fetch referral status transition history
   */
  async getReferralHistory(referralId) {
    if (!referralId) return [];
    try {
      const res = await apiClient.get(`/referrals/${referralId}/history`);
      return res.data?.data?.history || res.data?.data || [];
    } catch (err) {
      console.warn('[HospitalService] History endpoint fallback:', err?.message);
      return [];
    }
  },

  /**
   * Fetch attached clinical and diagnostic documents
   */
  async getReferralDocuments(referralId) {
    if (!referralId) return [];
    try {
      const res = await apiClient.get(`/referrals/${referralId}/documents`);
      return res.data?.data?.documents || res.data?.data || [];
    } catch (err) {
      console.warn('[HospitalService] Documents endpoint fallback:', err?.message);
      return [];
    }
  },

  /**
   * Fetch information requests associated with a referral
   */
  async getInformationRequests(referralId) {
    if (!referralId) return [];
    try {
      const res = await apiClient.get(`/referrals/${referralId}/information-requests`);
      return res.data?.data?.requests || res.data?.data || [];
    } catch (err) {
      console.warn('[HospitalService] Info requests endpoint fallback:', err?.message);
      return [];
    }
  },

  /**
   * Fetch actionable incoming referrals for hospital pending queue
   */
  async getPendingActions() {
    try {
      const res = await apiClient.get('/referrals/incoming', { params: { limit: 100 } });
      const payload = res.data || {};
      const allItems = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.referrals)
        ? payload.referrals
        : [];

      // Filter actionable cases: newly submitted, acknowledged, in review, or info requested
      const actionable = allItems.filter(r => {
        const s = (r.status || '').toUpperCase();
        return s === 'SUBMITTED' || s === 'PENDING' || s === 'ACKNOWLEDGED' || s === 'IN_REVIEW' || s === 'INFO_REQUESTED';
      });

      return actionable.map(ref => {
        const s = (ref.status || '').toUpperCase();
        let actionCategory = 'NEW_INCOMING';
        let actionRequired = 'Initial Review & Acknowledgement';

        if (s === 'ACKNOWLEDGED' || s === 'IN_REVIEW') {
          actionCategory = 'PENDING_TRIAGE';
          actionRequired = 'Specialist Triage & Bed Decision';
        } else if (s === 'INFO_REQUESTED') {
          actionCategory = 'INFO_REQUESTED';
          actionRequired = 'Awaiting Clinical Clarification from Health Centre';
        }

        return {
          ...ref,
          actionCategory,
          actionRequired
        };
      });
    } catch (err) {
      console.error('[HospitalService] Failed to load pending actions:', err);
      return [];
    }
  },

  /**
   * Fetch notifications addressed to the hospital or staff member
   */
  async getNotifications(params = {}) {
    try {
      const res = await apiClient.get('/notifications', { params });
      return res.data?.data || res.data || [];
    } catch (err) {
      console.warn('[HospitalService] Notifications endpoint fallback:', err?.message);
      return [];
    }
  },

  /**
   * Fetch missed real-time events since a given ISO timestamp
   */
  async getMissedEvents(params = {}) {
    try {
      const res = await apiClient.get('/realtime/missed-events', { params });
      return res.data?.data?.events || res.data?.data || [];
    } catch (err) {
      console.warn('[HospitalService] Missed events endpoint fallback:', err?.message);
      return [];
    }
  },

  /**
   * Clinician acknowledges incoming referral, marking it as received and under review
   */
  async acknowledgeReferral(referralId, notes = '') {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/acknowledge`, { notes });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Hospital clinician accepts referral, committing inpatient ward bed or specialist slot
   */
  async acceptReferral(referralId, { decision_notes, assigned_bed_type, allocated_ward_department } = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/accept`, {
      decision_notes,
      assigned_bed_type,
      allocated_ward_department
    });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Hospital clinician rejects referral with mandatory justification and reason code
   */
  async rejectReferral(referralId, { reason, rejection_reason_code, recommended_alternative_facility_id } = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/reject`, {
      reason,
      rejection_reason_code,
      recommended_alternative_facility_id
    });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Hospital clinician requests clinical clarifications or missing diagnostics from health centre
   */
  async requestInformation(referralId, { notes } = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/request-information`, { notes });
    return res.data?.data?.referral || res.data?.data || res.data;
  }
};
