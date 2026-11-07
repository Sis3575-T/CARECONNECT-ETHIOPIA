/**
 * CareConnect Ethiopia - Notification Recipient Resolution Engine
 * Resolves authorized, active staff recipients based on facility tenancy,
 * roles, and clinical referral relationships, preventing cross-facility leakage.
 */

import { DbService } from './dbService.js';
import assignmentRepository from '../repositories/assignmentRepository.js';
import UserModel from '../models/userModel.js';
import { ROLE_MAP } from '../middleware/rbac.js';
import { NOTIFICATION_TYPES } from '../constants/notifications.js';

export class NotificationRecipientResolver {
  constructor() {
    this.assignmentRepo = assignmentRepository;
    this.inMemoryUsers = new Map();
    this.inMemoryAssignments = new Map();
  }

  /**
   * Resolves recipients for a referral domain event
   * @param {object} referral - Referral domain entity
   * @param {string} eventType - NOTIFICATION_TYPES string
   * @returns {Promise<Array<{ userId: number, facilityId: string, roleName: string, email: string, phoneNumber: string }>>}
   */
  async resolveReferralRecipients(referral, eventType) {
    if (!referral) return [];

    const recipientsMap = new Map();
    const sourceFacilityId = referral.originating_facility_id || referral.source_facility_id;
    const targetFacilityId = referral.receiving_facility_id || referral.target_facility_id;

    // 1. Inbound to Receiving Facility (Hospital Triage & Staff)
    // E.g. SUBMITTED, RECEIVED, or coordination updates
    const isReceivingFacilityEvent = [
      NOTIFICATION_TYPES.REFERRAL_SUBMITTED,
      NOTIFICATION_TYPES.REFERRAL_RECEIVED,
      NOTIFICATION_TYPES.COORDINATION_TASK_ASSIGNED,
      NOTIFICATION_TYPES.PATIENT_ARRIVED
    ].includes(eventType);

    // 2. Outbound/Feedback to Originating Facility (Health Centre Staff & Referring Clinician)
    // E.g. ACKNOWLEDGED, ACCEPTED, REJECTED, INFO_REQUESTED, COMPLETED, CANCELLED
    const isOriginatingFacilityEvent = [
      NOTIFICATION_TYPES.REFERRAL_ACKNOWLEDGED,
      NOTIFICATION_TYPES.REFERRAL_ACCEPTED,
      NOTIFICATION_TYPES.REFERRAL_REJECTED,
      NOTIFICATION_TYPES.REFERRAL_INFO_REQUESTED,
      NOTIFICATION_TYPES.REFERRAL_COMPLETED,
      NOTIFICATION_TYPES.REFERRAL_CANCELLED
    ].includes(eventType);

    // 3. Operational Escalations
    const isEscalationEvent = [
      NOTIFICATION_TYPES.ESCALATION_CREATED,
      NOTIFICATION_TYPES.ESCALATION_RESOLVED,
      NOTIFICATION_TYPES.SLA_DEADLINE_APPROACHING
    ].includes(eventType);

    if (isReceivingFacilityEvent && targetFacilityId) {
      const hospitalStaff = await this._getActiveFacilityStaff(targetFacilityId, [
        'HOSPITAL_TRIAGE',
        'HOSPITAL_STAFF'
      ]);
      for (const staff of hospitalStaff) {
        recipientsMap.set(staff.userId, staff);
      }
    }

    if (isOriginatingFacilityEvent && sourceFacilityId) {
      // Always include referring clinician specifically if active
      const clinicianId = referral.referring_clinician_id || referral.created_by_user_id;
      if (clinicianId) {
        const clinician = await this._getActiveUser(clinicianId);
        if (clinician && this._isUserAssignedToFacility(clinician, sourceFacilityId)) {
          recipientsMap.set(clinician.userId, clinician);
        }
      }

      // Also notify active health centre clinical staff
      const hcStaff = await this._getActiveFacilityStaff(sourceFacilityId, [
        'HEALTH_CENTRE_STAFF'
      ]);
      for (const staff of hcStaff) {
        recipientsMap.set(staff.userId, staff);
      }
    }

    if (isEscalationEvent) {
      // Escalate to responsible facility leads
      const responsibleFacilityId = referral.responsible_facility_id || targetFacilityId || sourceFacilityId;
      if (responsibleFacilityId) {
        const triageLeads = await this._getActiveFacilityStaff(responsibleFacilityId, [
          'HOSPITAL_TRIAGE',
          'HOSPITAL_STAFF'
        ]);
        for (const staff of triageLeads) {
          recipientsMap.set(staff.userId, staff);
        }
      }

      // For high/critical escalations (level >= 2), include regional administrators
      const escalationLevel = Number(referral.escalation_level) || 1;
      if (escalationLevel >= 2) {
        const admins = await this._getSystemAdministrators();
        for (const admin of admins) {
          recipientsMap.set(admin.userId, admin);
        }
      }
    }

    return Array.from(recipientsMap.values());
  }

  /**
   * Resolves recipients for a transport or ambulance coordination event
   * @param {object} transportRecord
   * @param {string} eventType
   * @returns {Promise<Array<object>>}
   */
  async resolveTransportRecipients(transportRecord, eventType) {
    if (!transportRecord) return [];
    const recipientsMap = new Map();

    // 1. Assigned ambulance driver or coordinator
    if (transportRecord.assigned_driver_id) {
      const driver = await this._getActiveUser(transportRecord.assigned_driver_id);
      if (driver) recipientsMap.set(driver.userId, driver);
    }
    if (transportRecord.coordinator_user_id) {
      const coord = await this._getActiveUser(transportRecord.coordinator_user_id);
      if (coord) recipientsMap.set(coord.userId, coord);
    }

    // 2. Transport coordination unit at originating/managing facility
    if (transportRecord.managing_facility_id) {
      const transportStaff = await this._getActiveFacilityStaff(transportRecord.managing_facility_id, [
        'TRANSPORT_COORDINATOR'
      ]);
      for (const staff of transportStaff) {
        recipientsMap.set(staff.userId, staff);
      }
    }

    // 3. For delays or arrival, alert receiving facility triage
    if ([NOTIFICATION_TYPES.TRANSPORT_DELAY_REPORTED, NOTIFICATION_TYPES.PATIENT_ARRIVED].includes(eventType)) {
      if (transportRecord.destination_facility_id) {
        const triageStaff = await this._getActiveFacilityStaff(transportRecord.destination_facility_id, [
          'HOSPITAL_TRIAGE'
        ]);
        for (const staff of triageStaff) {
          recipientsMap.set(staff.userId, staff);
        }
      }
    }

    return Array.from(recipientsMap.values());
  }

  /**
   * Resolves recipients for system security and administrative alerts
   */
  async resolveSystemRecipients() {
    return await this._getSystemAdministrators();
  }

  // =========================================================================
  // Internal Resolution Helpers with Database and In-Memory Fallbacks
  // =========================================================================

  async _getActiveFacilityStaff(facilityId, allowedRoleNames = []) {
    const cleanFacilityId = String(facilityId).trim().toLowerCase();
    try {
      const sql = `
        SELECT 
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.phone_number,
          u.role_id,
          r.name as role_name,
          fsa.facility_id
        FROM facility_staff_assignments fsa
        JOIN users u ON fsa.user_id = u.id
        JOIN roles r ON u.role_id = r.id
        WHERE LOWER(fsa.facility_id) = $1
          AND u.is_active = TRUE
          AND u.deleted_at IS NULL
          AND (fsa.end_date IS NULL OR fsa.end_date >= CURRENT_DATE);
      `;
      const res = await DbService.query(sql, [cleanFacilityId]);
      if (res.rows && res.rows.length > 0) {
        let staff = res.rows.map(r => this._formatStaff(r));
        if (allowedRoleNames.length > 0) {
          staff = staff.filter(s => allowedRoleNames.includes(s.roleName));
        }
        return staff;
      }
    } catch {
      // In-memory fallback
    }

    // Fallback: check in-memory store
    const list = [];
    for (const [userId, assignment] of this.inMemoryAssignments.entries()) {
      if (String(assignment.facilityId).trim().toLowerCase() === cleanFacilityId) {
        const user = this.inMemoryUsers.get(userId);
        if (user && user.isActive && !user.deletedAt) {
          const roleName = user.roleName || ROLE_MAP[user.roleId]?.name || 'UNKNOWN';
          if (allowedRoleNames.length === 0 || allowedRoleNames.includes(roleName)) {
            list.push({
              userId: user.id,
              facilityId: assignment.facilityId,
              roleName,
              email: user.email,
              phoneNumber: user.phoneNumber || null,
              firstName: user.firstName,
              lastName: user.lastName
            });
          }
        }
      }
    }
    return list;
  }

  async _getActiveUser(userId) {
    const numId = Number(userId);
    try {
      const sql = `
        SELECT u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number, u.role_id, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.is_active = TRUE AND u.deleted_at IS NULL;
      `;
      const res = await DbService.query(sql, [numId]);
      if (res.rows && res.rows.length > 0) {
        return this._formatStaff(res.rows[0]);
      }
    } catch {
      // In-memory fallback
    }

    const u = this.inMemoryUsers.get(numId);
    if (u && u.isActive && !u.deletedAt) {
      return {
        userId: u.id,
        facilityId: u.facilityId || null,
        roleName: u.roleName || ROLE_MAP[u.roleId]?.name || 'UNKNOWN',
        email: u.email,
        phoneNumber: u.phoneNumber || null,
        firstName: u.firstName,
        lastName: u.lastName
      };
    }
    return null;
  }

  async _getSystemAdministrators() {
    try {
      const sql = `
        SELECT u.id as user_id, u.first_name, u.last_name, u.email, u.phone_number, u.role_id, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE (r.name = 'SYSTEM_ADMINISTRATOR' OR u.role_id = 6)
          AND u.is_active = TRUE AND u.deleted_at IS NULL;
      `;
      const res = await DbService.query(sql);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => this._formatStaff(r));
      }
    } catch {
      // In-memory fallback
    }

    const list = [];
    for (const u of this.inMemoryUsers.values()) {
      if ((u.roleId === 6 || u.roleName === 'SYSTEM_ADMINISTRATOR') && u.isActive && !u.deletedAt) {
        list.push({
          userId: u.id,
          facilityId: null,
          roleName: 'SYSTEM_ADMINISTRATOR',
          email: u.email,
          phoneNumber: u.phoneNumber || null,
          firstName: u.firstName,
          lastName: u.lastName
        });
      }
    }
    return list;
  }

  _isUserAssignedToFacility(user, facilityId) {
    if (!user || !facilityId) return false;
    const cleanFacilityId = String(facilityId).trim().toLowerCase();
    if (user.facilityId && String(user.facilityId).trim().toLowerCase() === cleanFacilityId) {
      return true;
    }
    const assignment = this.inMemoryAssignments.get(user.userId || user.id);
    return assignment && String(assignment.facilityId).trim().toLowerCase() === cleanFacilityId;
  }

  _formatStaff(row) {
    return {
      userId: row.user_id,
      facilityId: row.facility_id || null,
      roleName: row.role_name,
      email: row.email,
      phoneNumber: row.phone_number || null,
      firstName: row.first_name,
      lastName: row.last_name
    };
  }

  // Testing helpers
  seedUser(user) {
    this.inMemoryUsers.set(user.id, {
      ...user,
      isActive: user.isActive !== undefined ? user.isActive : true,
      deletedAt: user.deletedAt || null
    });
  }

  seedAssignment(userId, facilityId, role = 'STAFF') {
    this.inMemoryAssignments.set(userId, { userId, facilityId, role });
  }

  clearInMemory() {
    this.inMemoryUsers.clear();
    this.inMemoryAssignments.clear();
  }
}

export const notificationRecipientResolver = new NotificationRecipientResolver();
export default notificationRecipientResolver;
