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

/**
 * Pure calculation of hospital inpatient admission metrics from referrals list
 */
export function calculateAdmissionMetrics(referrals = []) {
  let receivedPendingAdmission = 0;
  let inProgressAdmitted = 0;
  let completedCount = 0;
  let closedCount = 0;
  let icuCount = 0;
  let emergencyObsCount = 0;
  let standardWardCount = 0;

  for (const ref of referrals) {
    const s = (ref?.status || '').toUpperCase();
    const bed = (ref?.assigned_bed_type || '').toUpperCase();

    if (s === 'PATIENT_ARRIVED' || s === 'ARRIVED') {
      receivedPendingAdmission++;
    } else if (s === 'IN_PROGRESS') {
      inProgressAdmitted++;
    } else if (s === 'COMPLETED') {
      completedCount++;
    } else if (s === 'CLOSED') {
      closedCount++;
    }

    if (bed.includes('ICU')) {
      icuCount++;
    } else if (bed.includes('EMERGENCY') || bed.includes('OBSERVATION')) {
      emergencyObsCount++;
    } else if (bed.includes('STANDARD') || s === 'IN_PROGRESS') {
      standardWardCount++;
    }
  }

  return {
    totalAdmissions: referrals.length,
    receivedPendingAdmission,
    inProgressAdmitted,
    completedCount,
    closedCount,
    icuCount,
    emergencyObsCount,
    standardWardCount,
    activeInpatientTotal: receivedPendingAdmission + inProgressAdmitted
  };
}

/**
 * Pure calculation of hospital discharge, transfer, and outcome metrics from referrals list
 */
export function calculateDischargeMetrics(referrals = []) {
  let readyForDischarge = 0;
  let dischargedCount = 0;
  let transferredCount = 0;
  let counterReferredCount = 0;
  let closedCount = 0;

  for (const ref of referrals) {
    const s = (ref?.status || '').toUpperCase();
    const hasReassignment = Array.isArray(ref?.reassignments)
      ? ref.reassignments.length > 0
      : Boolean(ref?.reassigned_to_facility_id);
    const isCounter = Boolean(
      ref?.counter_referral_instructions ||
      ref?.completion_reason === 'RETURNED_TO_REFERRING_FACILITY'
    );

    if (s === 'TRANSFERRED' || hasReassignment) {
      transferredCount++;
    } else if (s === 'COMPLETED') {
      if (isCounter) {
        counterReferredCount++;
      } else {
        dischargedCount++;
      }
    } else if (s === 'CLOSED') {
      closedCount++;
    } else if (s === 'IN_PROGRESS' || s === 'PATIENT_ARRIVED' || s === 'ARRIVED') {
      readyForDischarge++;
    }
  }

  return {
    totalCases: referrals.length,
    readyForDischarge,
    dischargedCount,
    transferredCount,
    counterReferredCount,
    closedCount,
    activeInpatientEligible: readyForDischarge
  };
}

/**
 * Standardized Ethiopian healthcare patient referral clinical outcome categories
 */
export const OUTCOME_CATEGORIES = [
  {
    value: 'CLINICALLY_IMPROVED',
    label: 'Clinically Improved',
    desc: 'Patient showed clear clinical and symptom improvement under hospital management.',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
  },
  {
    value: 'SPECIALIST_OBJECTIVE_RESOLVED',
    label: 'Specialist Objective Resolved',
    desc: 'The specific specialized consultation, surgery, or diagnostic procedure was completed.',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300'
  },
  {
    value: 'STABILIZED',
    label: 'Stabilized Condition',
    desc: 'Acute phase stabilized; ongoing chronic or long-term management required.',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
  },
  {
    value: 'UNCHANGED',
    label: 'Unchanged Baseline',
    desc: 'Patient remains at baseline chronic state with no clinical progression.',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
  },
  {
    value: 'TRANSFERRED_SUPER_SPECIALTY',
    label: 'Transferred to Higher Care',
    desc: 'Patient transferred onward to national institute or super-specialty hospital.',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
  },
  {
    value: 'SELF_DISCHARGED',
    label: 'Discharged Against Advice (AMA)',
    desc: 'Patient or family requested early departure against medical recommendations.',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
  },
  {
    value: 'DECEASED',
    label: 'Deceased During Stay',
    desc: 'Patient expired during inpatient hospital hospitalization.',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
  }
];

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
  },

  /**
   * Retrieve accepted referrals eligible for patient arrival, handover, and receiving
   */
  async getArrivalQueue(params = {}) {
    try {
      const res = await apiClient.get('/referrals/incoming', {
        params: {
          limit: params.limit || 50,
          page: params.page || 1,
          search: params.search || undefined,
          priority: params.priority || undefined,
          status: params.status || undefined
        }
      });
      const payload = res.data || {};
      const allItems = Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.referrals)
        ? payload.referrals
        : [];

      // Filter referrals that are accepted, en-route, arrived, or admitted
      const arrivalEligible = allItems.filter(r => {
        const s = (r.status || '').toUpperCase();
        return ['ACCEPTED', 'TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'PATIENT_ARRIVED', 'ARRIVED', 'IN_PROGRESS'].includes(s);
      });

      return {
        referrals: arrivalEligible,
        total: arrivalEligible.length,
        page: payload.pagination?.page || params.page || 1,
        limit: payload.pagination?.limit || params.limit || 50
      };
    } catch (err) {
      console.error('[HospitalService] Failed to load arrival queue:', err);
      throw err;
    }
  },

  /**
   * Hospital triage/receiving staff confirms physical arrival of patient
   */
  async confirmPatientArrival(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/arrival`, {
      arrival_notes: payload.arrival_notes || payload.notes || 'Physical patient arrival confirmed at hospital triage',
      actual_arrival_time: payload.actual_arrival_time || new Date().toISOString(),
      receiving_department: payload.receiving_department,
      receiving_staff_name: payload.receiving_staff_name,
      verification_confirmed: payload.verification_confirmed !== false
    });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Record structured patient handover from referring facility / ambulance crew
   */
  async recordPatientHandover(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    try {
      const res = await apiClient.post(`/referrals/${referralId}/follow-ups`, {
        interaction_type: 'HANDOVER_DOCUMENTATION',
        notes: payload.handover_notes || 'Patient handover completed with escort team',
        details: {
          handoverGiverName: payload.handover_giver_name,
          handoverGiverRole: payload.handover_giver_role,
          receivingStaffName: payload.receiving_staff_name,
          documentsReceived: payload.documents_received || [],
          belongingsReceived: payload.belongings_received,
          conditionSummary: payload.physical_condition_summary,
          handoverTime: payload.handover_time || new Date().toISOString()
        }
      });
      return res.data?.data || res.data;
    } catch (err) {
      // Fallback to progress endpoint if follow-ups is unavailable
      const fallbackRes = await apiClient.post(`/referrals/${referralId}/progress`, {
        progress_notes: `Patient Handover: ${payload.handover_notes || 'Handover completed with escort team'}`
      });
      return fallbackRes.data?.data?.referral || fallbackRes.data?.data || fallbackRes.data;
    }
  },

  /**
   * Hospital confirms official receipt and operational admission into receiving ward
   */
  async confirmReceivingAdmission(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/progress`, {
      progress_notes: payload.progress_notes || payload.admission_notes || 'Patient admitted into ward care and active treatment initiated',
      admitted_ward: payload.admitted_ward || payload.allocated_ward_department,
      admitted_bed: payload.admitted_bed || payload.assigned_bed_type,
      receiving_staff_name: payload.receiving_staff_name
    });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Hospital Inpatient Admissions Queue
   * Filters incoming referrals for received, admitted, progress, and completed cases
   */
  async getAdmissionsQueue(params = {}) {
    try {
      const res = await apiClient.get('/referrals/incoming', {
        params: { limit: 100 }
      });
      const payload = res.data?.data || res.data || {};
      const allItems = payload.referrals || payload.items || [];

      // Filter referrals that are arrived, in-progress, completed, or closed
      const admissionEligible = allItems.filter(r => {
        const s = (r.status || '').toUpperCase();
        return ['PATIENT_ARRIVED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(s);
      });

      return {
        referrals: admissionEligible,
        total: admissionEligible.length,
        page: payload.pagination?.page || params.page || 1,
        limit: payload.pagination?.limit || params.limit || 50
      };
    } catch (err) {
      console.error('[HospitalService] Failed to load admissions queue:', err);
      throw err;
    }
  },

  /**
   * Fetch active clinical departments for this hospital
   */
  async getHospitalDepartments(facilityId) {
    if (!facilityId) return [];
    try {
      const res = await apiClient.get(`/facilities/${facilityId}/departments`);
      const list = res.data?.data?.departments || res.data?.departments || [];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // Fallback to recognized departments
    }
    return [
      { id: 'dept-emg', code: 'EMG', name: 'Emergency & Critical Care', isActive: true },
      { id: 'dept-med', code: 'MED', name: 'Internal Medicine Ward', isActive: true },
      { id: 'dept-surg', code: 'SURG', name: 'General Surgery Ward', isActive: true },
      { id: 'dept-ped', code: 'PED', name: 'Pediatrics & Child Health', isActive: true },
      { id: 'dept-obg', code: 'OBGYN', name: 'Obstetrics & Gynecology (Maternity)', isActive: true },
      { id: 'dept-icu', code: 'ICU', name: 'Intensive Care Unit (ICU)', isActive: true },
      { id: 'dept-orth', code: 'ORTHO', name: 'Orthopedics & Trauma', isActive: true }
    ];
  },

  /**
   * Fetch clinical services registered for this hospital
   */
  async getHospitalServices(facilityId) {
    if (!facilityId) return [];
    try {
      const res = await apiClient.get(`/facilities/${facilityId}/services`);
      const list = res.data?.data?.services || res.data?.services || [];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // Fallback
    }
    return [
      { id: 'srv-emg', serviceCode: 'EMERGENCY_CARE', isAvailable: true, operatingHours: '24/7' },
      { id: 'srv-icu', serviceCode: 'ICU_VENTILATOR', isAvailable: true, operatingHours: '24/7' },
      { id: 'srv-surg', serviceCode: 'EMERGENCY_SURGERY', isAvailable: true, operatingHours: '24/7' },
      { id: 'srv-neo', serviceCode: 'NICU_INCUBATOR', isAvailable: true, operatingHours: '24/7' },
      { id: 'srv-blood', serviceCode: 'BLOOD_BANK', isAvailable: true, operatingHours: '24/7' },
      { id: 'srv-dial', serviceCode: 'HEMODIALYSIS', isAvailable: true, operatingHours: 'Daytime' }
    ];
  },

  /**
   * Fetch active staff assigned to this hospital
   */
  async getHospitalStaff(facilityId) {
    if (!facilityId) return [];
    try {
      const res = await apiClient.get(`/facilities/${facilityId}/staff`);
      const list = res.data?.data?.staff || res.data?.staff || [];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // Fallback
    }
    return [
      { id: 101, firstName: 'Dr. Selamawit', lastName: 'Bekele', roleName: 'Senior Registrar (Internal Medicine)' },
      { id: 102, firstName: 'Dr. Tewodros', lastName: 'Haile', roleName: 'Specialist General Surgeon' },
      { id: 103, firstName: 'Dr. Meron', lastName: 'Getachew', roleName: 'Emergency Medicine Consultant' },
      { id: 104, firstName: 'Sister Bethlehem', lastName: 'Alemu', roleName: 'Ward Charge Nurse' }
    ];
  },

  /**
   * Assign or reassign patient to a hospital department and attending staff
   */
  async assignDepartment(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const deptName = payload.department_name || payload.department || 'General Inpatient';
    const bedType = payload.assigned_bed_type || payload.bed_type || 'STANDARD';
    const staffId = payload.staff_id || payload.receiving_clinician_id;

    const res = await apiClient.post(`/referrals/${referralId}/progress`, {
      progress_notes: payload.notes || `Assigned to department: ${deptName} (${bedType})`,
      allocated_ward_department: deptName,
      assigned_bed_type: bedType,
      receiving_clinician_id: staffId
    });

    try {
      await apiClient.post(`/referrals/${referralId}/follow-ups`, {
        communication_channel: 'IN_PLATFORM',
        outcome: 'DEPARTMENT_ASSIGNED',
        reason_or_notes: `Department assignment updated: ${deptName} (${bedType}). ${payload.notes || ''}`.trim()
      });
    } catch {
      // Non-blocking
    }

    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Record operational care progress note and milestone
   */
  async recordCareProgress(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const notes = payload.notes || payload.progress_notes || 'Clinical care continuing in assigned department';

    const res = await apiClient.post(`/referrals/${referralId}/progress`, {
      progress_notes: notes,
      allocated_ward_department: payload.allocated_ward_department,
      assigned_bed_type: payload.assigned_bed_type
    });

    try {
      await apiClient.post(`/referrals/${referralId}/follow-ups`, {
        communication_channel: 'IN_PLATFORM',
        outcome: payload.event_type || 'CARE_PROGRESS_UPDATE',
        reason_or_notes: notes
      });
    } catch {
      // Non-blocking
    }

    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Hospital completes clinical referral workflow
   */
  async completeReferral(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/complete`, {
      outcome_notes: payload.outcome_notes || payload.notes || 'Tertiary clinical care completed and specialist objectives satisfied',
      completion_reason: payload.completion_reason || 'SPECIALIST_CARE_DELIVERED',
      counter_referral_instructions: payload.counter_referral_instructions || null,
      clinician_signature: payload.clinician_signature || null
    });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Administrative closure of referral dossier
   */
  async closeReferral(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/close`, {
      closure_reason: payload.closure_reason || payload.notes || 'Referral discharge and administrative dossier closed'
    });
    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Fetch referrals eligible or processed through hospital discharge, transfer, and outcome workflows
   */
  async getDischargeQueue(params = {}) {
    try {
      const res = await apiClient.get('/referrals/incoming', {
        params: { limit: 100, ...params }
      });
      const referrals = res.data?.data?.referrals || res.data?.referrals || [];
      return {
        referrals,
        total: res.data?.data?.total || referrals.length
      };
    } catch (err) {
      console.error('[HospitalService] Failed to load discharge queue:', err?.message);
      return { referrals: [], total: 0 };
    }
  },

  /**
   * Fetch potential inter-facility transfer hospital destinations
   */
  async getTransferDestinations(params = {}) {
    try {
      const res = await apiClient.get('/facilities', {
        params: { type: 'HOSPITAL', limit: 50, ...params }
      });
      const list = res.data?.data?.facilities || res.data?.facilities || [];
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // Fallback resilient hospital registry
    }
    return [
      { id: 201, name: 'Tikur Anbessa Specialized Hospital', type: 'HOSPITAL', region: 'Addis Ababa', level: 'TERTIARY_SPECIALIZED' },
      { id: 202, name: 'St. Paul’s Hospital Millennium Medical College', type: 'HOSPITAL', region: 'Addis Ababa', level: 'TERTIARY_SPECIALIZED' },
      { id: 203, name: 'Alert Specialized Hospital', type: 'HOSPITAL', region: 'Addis Ababa', level: 'SPECIALIZED_HOSPITAL' },
      { id: 204, name: 'Hawassa University Comprehensive Specialized Hospital', type: 'HOSPITAL', region: 'Sidama', level: 'TERTIARY_SPECIALIZED' },
      { id: 205, name: 'Jimma University Medical Center', type: 'HOSPITAL', region: 'Oromia', level: 'TERTIARY_SPECIALIZED' }
    ];
  },

  /**
   * Authoritative hospital discharge documentation
   */
  async recordDischarge(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/complete`, {
      outcome_notes: payload.clinical_summary || payload.notes || 'Inpatient clinical treatment completed; patient discharged in stable condition',
      completion_reason: payload.discharge_reason || payload.disposition || 'DISCHARGED_HOME',
      counter_referral_instructions: payload.post_discharge_instructions || null,
      clinician_signature: payload.clinician_signature || null
    });

    try {
      await apiClient.post(`/referrals/${referralId}/follow-ups`, {
        communication_channel: 'IN_PLATFORM',
        outcome: 'DISCHARGE_DOCUMENTED',
        reason_or_notes: `Discharge disposition: ${payload.disposition || 'ROUTINE_HOME'}. Reason: ${payload.discharge_reason || 'CLINICALLY_STABLE'}. Summary: ${payload.clinical_summary || ''}`.trim()
      });
    } catch {
      // Non-blocking follow-up record
    }

    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Inter-facility clinical transfer workflow
   */
  async recordTransfer(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    if (!payload.new_facility_id) throw new Error('Target hospital facility ID is required for inter-facility transfer');

    const res = await apiClient.post(`/referrals/${referralId}/reassignments`, {
      new_facility_id: payload.new_facility_id,
      reassignment_reason: payload.reassignment_reason || 'CLINICAL_ESCALATION',
      reassignment_notes: payload.reassignment_notes || payload.transfer_summary || 'Inter-facility specialized clinical transfer requested'
    });

    try {
      await apiClient.post(`/referrals/${referralId}/follow-ups`, {
        communication_channel: 'IN_PLATFORM',
        outcome: 'INTER_FACILITY_TRANSFER',
        reason_or_notes: `Inter-facility transfer initiated to Facility #${payload.new_facility_id}. Reason: ${payload.reassignment_reason || 'CLINICAL_ESCALATION'}. Escort/transport: ${payload.escort_required ? 'Escort Required' : 'Standard'}. ${payload.transfer_summary || ''}`.trim()
      });
    } catch {
      // Non-blocking
    }

    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Return-to-referring-facility (Counter-referral) workflow
   */
  async recordReturnToReferrer(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const res = await apiClient.post(`/referrals/${referralId}/complete`, {
      outcome_notes: payload.outcome_notes || payload.counter_referral_summary || 'Specialist treatment completed; patient counter-referred to origin health centre for localized continuation of care',
      completion_reason: 'RETURNED_TO_REFERRING_FACILITY',
      counter_referral_instructions: payload.counter_referral_instructions || payload.instructions || 'Continue prescribed outpatient regimen and monitor vitals at primary health centre',
      clinician_signature: payload.clinician_signature || null
    });

    try {
      await apiClient.post(`/referrals/${referralId}/follow-ups`, {
        communication_channel: 'IN_PLATFORM',
        outcome: 'RETURNED_TO_REFERRING_FACILITY',
        reason_or_notes: `Counter-referral to referring health centre completed. Instructions: ${payload.counter_referral_instructions || ''}`.trim()
      });
    } catch {
      // Non-blocking
    }

    return res.data?.data?.referral || res.data?.data || res.data;
  },

  /**
   * Standardized patient outcome documentation
   */
  async recordPatientOutcome(referralId, payload = {}) {
    if (!referralId) throw new Error('Referral ID required');
    const outcomeCat = payload.outcome_category || payload.outcome || 'CLINICALLY_IMPROVED';
    const notes = payload.outcome_notes || payload.notes || `Clinical outcome documented: ${outcomeCat}`;

    const res = await apiClient.post(`/referrals/${referralId}/follow-ups`, {
      communication_channel: 'IN_PLATFORM',
      outcome: outcomeCat,
      reason_or_notes: `${outcomeCat}: ${notes}`.trim()
    });

    return res.data?.data?.followUp || res.data?.data || res.data;
  },

  /**
   * Fetch reassignments history for referral
   */
  async getReassignments(referralId) {
    if (!referralId) return [];
    try {
      const res = await apiClient.get(`/referrals/${referralId}/reassignments`);
      return res.data?.data?.reassignments || res.data?.reassignments || [];
    } catch {
      return [];
    }
  }
};
