/**
 * CareConnect Ethiopia - Health Centre Patient Management Service
 * Frontend API client service for patient registration, directory search,
 * demographic profiles, duplicate governance, corrections, and emergency contacts.
 * Integrated with backend /api/v1/patients REST contracts.
 */

import { apiClient } from '../../../../shared/services/apiClient.js';

export const patientService = {
  /**
   * Search and list patients with facility isolation and server-side pagination.
   * @param {Object} params - Query parameters (page, limit, search, region, woreda, gender, status)
   * @param {AbortSignal} [signal] - Optional abort signal
   */
  async getPatients(params = {}, signal = null) {
    try {
      const response = await apiClient.get('/patients', {
        params: {
          page: params.page || 1,
          limit: params.limit || 10,
          search: params.search?.trim() || undefined,
          region: params.region || undefined,
          woreda: params.woreda || undefined,
          gender: params.gender && params.gender !== 'ALL' ? params.gender : undefined,
          status: params.status && params.status !== 'ALL' ? params.status : undefined
        },
        signal
      });

      const items = Array.isArray(response?.data) ? response.data : (response?.data?.data || []);
      const pagination = response?.meta?.pagination || {
        page: params.page || 1,
        limit: params.limit || 10,
        total: items.length,
        totalPages: 1
      };

      return {
        success: true,
        data: items,
        pagination
      };
    } catch (error) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        throw error;
      }
      throw error;
    }
  },

  /**
   * Fetch single patient by primary reference ID (e.g. ETH-PAT-2026-XXXXXX).
   * @param {string} patientId
   */
  async getPatientById(patientId) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.get(`/patients/${encodeURIComponent(patientId)}`);
    return response?.data?.patient || response?.data;
  },

  /**
   * Register a new patient under the authenticated clinician's facility.
   * @param {Object} payload - Patient demographic & identification details
   */
  async registerPatient(payload) {
    const response = await apiClient.post('/patients', payload);
    return response?.data?.patient || response?.data;
  },

  /**
   * Update patient demographics.
   * @param {string} patientId
   * @param {Object} updates
   */
  async updatePatient(patientId, updates) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.patch(`/patients/${encodeURIComponent(patientId)}`, updates);
    return response?.data?.patient || response?.data;
  },

  /**
   * Update patient lifecycle status (ACTIVE, INACTIVE, DECEASED, MERGED).
   * @param {string} patientId
   * @param {Object} statusPayload - { status, merged_into_patient_id, reason }
   */
  async updatePatientStatus(patientId, statusPayload) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.patch(`/patients/${encodeURIComponent(patientId)}/status`, statusPayload);
    return response?.data?.patient || response?.data;
  },

  /**
   * Record demographic correction with audit trail.
   * @param {string} patientId
   * @param {Object} correctionPayload - { field_name, new_value, reason }
   */
  async recordCorrection(patientId, correctionPayload) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.post(`/patients/${encodeURIComponent(patientId)}/corrections`, correctionPayload);
    return response?.data?.correction || response?.data;
  },

  /**
   * Fetch patient audit history (corrections and duplicate review logs).
   * @param {string} patientId
   */
  async getPatientHistory(patientId) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.get(`/patients/${encodeURIComponent(patientId)}/history`);
    return response?.data || { corrections: [], duplicate_reviews: [] };
  },

  /**
   * Pre-registration identification search for candidate matches.
   * @param {Object} criteria - { first_name, father_name, phone_number, national_id, mrn, woreda, age_years }
   */
  async identifyPatients(criteria = {}, signal = null) {
    const response = await apiClient.get('/patients/identify', {
      params: criteria,
      signal
    });
    return response?.data?.candidates || [];
  },

  /**
   * Fetch possible duplicates for an existing patient.
   * @param {string} patientId
   */
  async getPossibleDuplicates(patientId) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.get(`/patients/${encodeURIComponent(patientId)}/possible-duplicates`);
    return response?.data?.candidates || [];
  },

  /**
   * Record clinical duplicate review decision.
   * @param {string} patientId
   * @param {Object} reviewPayload - { candidate_patient_id, review_status, match_score, match_signals, notes }
   */
  async recordDuplicateReview(patientId, reviewPayload) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.post(`/patients/${encodeURIComponent(patientId)}/duplicate-review`, reviewPayload);
    return response?.data?.review || response?.data;
  },

  /**
   * Fetch emergency contacts for a patient.
   * @param {string} patientId
   */
  async getEmergencyContacts(patientId) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.get(`/patients/${encodeURIComponent(patientId)}/emergency-contacts`);
    return response?.data?.contacts || [];
  },

  /**
   * Add emergency contact for a patient.
   * @param {string} patientId
   * @param {Object} contactPayload
   */
  async addEmergencyContact(patientId, contactPayload) {
    if (!patientId) throw new Error('Patient ID is required');
    const response = await apiClient.post(`/patients/${encodeURIComponent(patientId)}/emergency-contacts`, contactPayload);
    return response?.data?.contact || response?.data;
  },

  /**
   * Update emergency contact.
   * @param {string} patientId
   * @param {string} contactId
   * @param {Object} contactPayload
   */
  async updateEmergencyContact(patientId, contactId, contactPayload) {
    if (!patientId || !contactId) throw new Error('Patient and contact IDs are required');
    const response = await apiClient.patch(
      `/patients/${encodeURIComponent(patientId)}/emergency-contacts/${encodeURIComponent(contactId)}`,
      contactPayload
    );
    return response?.data?.contact || response?.data;
  },

  /**
   * Delete emergency contact.
   * @param {string} patientId
   * @param {string} contactId
   */
  async deleteEmergencyContact(patientId, contactId) {
    if (!patientId || !contactId) throw new Error('Patient and contact IDs are required');
    const response = await apiClient.delete(
      `/patients/${encodeURIComponent(patientId)}/emergency-contacts/${encodeURIComponent(contactId)}`
    );
    return response?.data || { success: true };
  },

  /**
   * Fetch care coordination referrals for a specific patient.
   * @param {string} patientId
   */
  async getPatientReferrals(patientId) {
    if (!patientId) return [];
    try {
      const response = await apiClient.get('/referrals', {
        params: { patientId, limit: 50 }
      });
      return Array.isArray(response?.data) ? response.data : (response?.data?.data || []);
    } catch {
      return [];
    }
  }
};

export default patientService;
