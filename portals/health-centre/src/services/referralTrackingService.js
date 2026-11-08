/**
 * CareConnect Ethiopia - Referral Tracking & Coordination Gateway Service
 * Connects Health Centre Portal to versioned backend endpoints for referral
 * tracking, status timeline, hospital responses, additional information requests,
 * follow-up interactions, and operational escalations.
 */

import { apiClient } from '../../../../shared/services/apiClient.js';

class ReferralTrackingService {
  /**
   * List referrals for the current authenticated facility with filters & pagination
   * @param {Object} params - { page, limit, status, priority, search, destination_facility_id, sortBy, sortOrder }
   */
  async getReferrals(params = {}) {
    const res = await apiClient.get('/referrals', { params });
    return res.data;
  }

  /**
   * Get single referral record by UUID or reference number
   * @param {string} referralId
   */
  async getReferralById(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}`);
    return res.data?.data?.referral || res.data?.referral || res.data?.data || res.data;
  }

  /**
   * Retrieve unified chronological coordination timeline for a referral
   * @param {string} referralId
   */
  async getReferralTimeline(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/timeline`);
    return res.data?.data?.timeline || res.data?.timeline || res.data?.data || [];
  }

  /**
   * Retrieve audit status history for a referral
   * @param {string} referralId
   */
  async getReferralHistory(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/history`);
    return res.data?.data?.history || res.data?.history || res.data?.data || [];
  }

  /**
   * Query status summary for a referral
   * @param {string} referralId
   */
  async getReferralStatus(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/status`);
    return res.data?.data || res.data;
  }

  /**
   * Public or authenticated tracking by referral reference code (ETH-REF-YYYY-XXXXXX)
   * @param {string} reference
   */
  async trackByReference(reference) {
    const res = await apiClient.get(`/referrals/track/${encodeURIComponent(reference)}`);
    return res.data?.data?.referral || res.data?.referral || res.data?.data || res.data;
  }

  /**
   * List additional information requests submitted by receiving hospital
   * @param {string} referralId
   */
  async getInformationRequests(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/information-requests`);
    return res.data?.data?.requests || res.data?.requests || res.data?.data || [];
  }

  /**
   * Respond to an additional information request from the hospital
   * @param {string} referralId
   * @param {string} requestId
   * @param {Object} payload - { response_notes, attachment_ids }
   */
  async respondToInformationRequest(referralId, requestId, payload) {
    const res = await apiClient.post(
      `/referrals/${encodeURIComponent(referralId)}/information-requests/${encodeURIComponent(requestId)}/respond`,
      payload
    );
    return res.data?.data?.request || res.data?.request || res.data;
  }

  /**
   * Get recorded follow-up interactions for a referral
   * @param {string} referralId
   */
  async getFollowUps(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/follow-ups`);
    return res.data?.data?.follow_ups || res.data?.follow_ups || res.data?.data || [];
  }

  /**
   * Record a follow-up interaction or coordination phone call
   * @param {string} referralId
   * @param {Object} payload - { communication_channel, outcome, reason_or_notes, next_follow_up_date }
   */
  async recordFollowUp(referralId, payload) {
    const res = await apiClient.post(
      `/referrals/${encodeURIComponent(referralId)}/follow-ups`,
      payload
    );
    return res.data?.data?.follow_up || res.data?.follow_up || res.data;
  }

  /**
   * Get operational escalations associated with this referral
   * @param {string} referralId
   */
  async getEscalations(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/escalations`);
    return res.data?.data?.escalations || res.data?.escalations || res.data?.data || [];
  }

  /**
   * Create an operational escalation (administrative SLA notification)
   * @param {string} referralId
   * @param {Object} payload - { escalation_level, reason, notes }
   */
  async createEscalation(referralId, payload) {
    const res = await apiClient.post(
      `/referrals/${encodeURIComponent(referralId)}/escalations`,
      payload
    );
    return res.data?.data?.escalation || res.data?.escalation || res.data;
  }

  /**
   * Get operational delay measurements
   * @param {string} referralId
   */
  async getDelays(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/delays`);
    return res.data?.data?.delays || res.data?.delays || res.data?.data || [];
  }

  /**
   * Fetch attached documents for a referral
   * @param {string} referralId
   */
  async getReferralDocuments(referralId) {
    const res = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/documents`);
    return res.data?.data?.documents || res.data?.documents || res.data?.data || [];
  }

  /**
   * Upload an additional document attachment to an existing referral
   * @param {string} referralId
   * @param {File} file
   * @param {Object} meta - { title, documentType, description }
   */
  async uploadReferralDocument(referralId, file, meta = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (meta.title) formData.append('title', meta.title);
    if (meta.documentType) formData.append('document_type', meta.documentType);
    if (meta.description) formData.append('description', meta.description);

    const res = await apiClient.post(
      `/referrals/${encodeURIComponent(referralId)}/documents`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return res.data?.data?.document || res.data?.document || res.data;
  }

  /**
   * Fetch missed real-time events upon reconnection
   * @param {Object} params - { since, lastEventId, limit }
   */
  async getMissedEvents(params = {}) {
    const res = await apiClient.get('/realtime/missed-events', { params });
    return res.data?.data?.events || res.data?.events || res.data?.data || [];
  }
}

export const referralTrackingService = new ReferralTrackingService();
export default referralTrackingService;
