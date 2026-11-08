/**
 * CareConnect Ethiopia - Referral Creation API Service
 * Interacts with backend /api/v1/referrals and /api/v1/facilities endpoints.
 * Provides resilient HTTP communication for referral drafting, submission,
 * destination hospital discovery, service capabilities, and document attachments.
 */

import { apiClient } from '../../../../shared/services/apiClient.js';

export const referralCreationService = {
  /**
   * Create a new referral (Draft or direct Submission)
   * @param {Object} payload - Referral data
   */
  async createReferral(payload) {
    const response = await apiClient.post('/referrals', payload);
    return response?.data?.referral || response?.data;
  },

  /**
   * Submit an existing draft referral
   * @param {string} referralId
   */
  async submitReferral(referralId) {
    if (!referralId) throw new Error('referralId is required');
    const response = await apiClient.post(`/referrals/${encodeURIComponent(referralId)}/submit`);
    return response?.data?.referral || response?.data;
  },

  /**
   * Update details of an existing draft referral
   * @param {string} referralId
   * @param {Object} updates
   */
  async updateReferral(referralId, updates) {
    if (!referralId) throw new Error('referralId is required');
    const response = await apiClient.patch(`/referrals/${encodeURIComponent(referralId)}`, updates);
    return response?.data?.referral || response?.data;
  },

  /**
   * Fetch single referral record by reference or ID
   * @param {string} referralId
   */
  async getReferralById(referralId) {
    if (!referralId) throw new Error('referralId is required');
    const response = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}`);
    return response?.data?.referral || response?.data;
  },

  /**
   * Retrieve eligible destination hospitals
   * @param {Object} params - { region, search, limit }
   */
  async getDestinationHospitals(params = {}) {
    try {
      const response = await apiClient.get('/facilities', {
        params: {
          limit: params.limit || 50,
          region: params.region && params.region !== 'ALL' ? params.region : undefined,
          search: params.search?.trim() || undefined,
          status: 'active'
        }
      });

      const allFacilities = Array.isArray(response?.data)
        ? response.data
        : (response?.data?.facilities || response?.data?.data || []);

      // Filter for hospital tiers eligible for receiving health centre referrals
      const hospitals = allFacilities.filter((f) => {
        const type = String(f.facility_type || f.type || '').toUpperCase();
        return (
          type.includes('HOSPITAL') ||
          type === 'PRIMARY_HOSPITAL' ||
          type === 'GENERAL_HOSPITAL' ||
          type === 'TERTIARY_HOSPITAL' ||
          type === 'COMPREHENSIVE_SPECIALIZED_HOSPITAL'
        );
      });

      // If strict filter yields empty in test environment, return all non-health-centre active facilities
      return hospitals.length > 0
        ? hospitals
        : allFacilities.filter((f) => !String(f.facility_type || f.type || '').toUpperCase().includes('CENTRE'));
    } catch {
      return [];
    }
  },

  /**
   * Retrieve clinical departments and services available at a specific hospital
   * @param {string} facilityId
   */
  async getHospitalServices(facilityId) {
    if (!facilityId) return [];
    try {
      const response = await apiClient.get(`/facilities/${encodeURIComponent(facilityId)}/services`);
      return response?.data?.services || response?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Upload a medical document attachment to a referral
   * @param {string} referralId
   * @param {File} file
   * @param {string} [documentType] - CLINICAL_NOTE, LAB_RESULT, IMAGING, etc.
   */
  async uploadReferralDocument(referralId, file, documentType = 'CLINICAL_NOTE') {
    if (!referralId || !file) throw new Error('referralId and file are required');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('title', file.name);

    const response = await apiClient.post(
      `/referrals/${encodeURIComponent(referralId)}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return response?.data || response;
  },

  /**
   * List all documents attached to a referral
   * @param {string} referralId
   */
  async getReferralDocuments(referralId) {
    if (!referralId) return [];
    try {
      const response = await apiClient.get(`/referrals/${encodeURIComponent(referralId)}/documents`);
      return Array.isArray(response?.data) ? response.data : (response?.data?.data || []);
    } catch {
      return [];
    }
  }
};

export default referralCreationService;
