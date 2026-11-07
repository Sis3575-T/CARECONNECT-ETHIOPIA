/**
 * CareConnect Ethiopia - Notification Recipient Resolution Unit Tests
 * Verifies role-based recipient matching, facility tenancy isolation,
 * exclusion of inactive/deleted accounts, and escalation chains — Commit 098.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NotificationRecipientResolver } from '../src/services/notificationRecipientResolver.js';
import { NOTIFICATION_TYPES } from '../src/constants/notifications.js';

describe('Commit 098: Notification Recipient Resolution Suite', () => {
  let resolver;

  beforeEach(() => {
    resolver = new NotificationRecipientResolver();

    // Health Centre Staff (HC-01)
    resolver.seedUser({
      id: 1,
      firstName: 'Almaz',
      lastName: 'Kebede',
      email: 'clinician@hc01.et',
      roleId: 1, // HEALTH_CENTRE_STAFF
      roleName: 'HEALTH_CENTRE_STAFF',
      facilityId: 'fac-hc-01'
    });
    resolver.seedAssignment(1, 'fac-hc-01');

    // Hospital A Triage (HOSP-01)
    resolver.seedUser({
      id: 2,
      firstName: 'Dawit',
      lastName: 'Tadesse',
      email: 'triage@hosp01.et',
      roleId: 3, // HOSPITAL_TRIAGE
      roleName: 'HOSPITAL_TRIAGE',
      facilityId: 'fac-hosp-01'
    });
    resolver.seedAssignment(2, 'fac-hosp-01');

    // Hospital B Triage (HOSP-02) - Different facility
    resolver.seedUser({
      id: 3,
      firstName: 'Selam',
      lastName: 'Haile',
      email: 'triage@hosp02.et',
      roleId: 3,
      roleName: 'HOSPITAL_TRIAGE',
      facilityId: 'fac-hosp-02'
    });
    resolver.seedAssignment(3, 'fac-hosp-02');

    // Inactive Hospital A Staff
    resolver.seedUser({
      id: 4,
      firstName: 'Inactive',
      lastName: 'Doctor',
      email: 'inactive@hosp01.et',
      roleId: 2, // HOSPITAL_STAFF
      roleName: 'HOSPITAL_STAFF',
      isActive: false,
      facilityId: 'fac-hosp-01'
    });
    resolver.seedAssignment(4, 'fac-hosp-01');

    // Deleted User
    resolver.seedUser({
      id: 5,
      firstName: 'Deleted',
      lastName: 'Worker',
      email: 'deleted@hosp01.et',
      roleId: 3,
      deletedAt: new Date().toISOString(),
      facilityId: 'fac-hosp-01'
    });
    resolver.seedAssignment(5, 'fac-hosp-01');

    // Transport Coordinator
    resolver.seedUser({
      id: 6,
      firstName: 'Abebe',
      lastName: 'Bikila',
      email: 'transport@dispatch.et',
      roleId: 4, // TRANSPORT_COORDINATOR
      roleName: 'TRANSPORT_COORDINATOR',
      facilityId: 'fac-trans-01'
    });
    resolver.seedAssignment(6, 'fac-trans-01');

    // System Administrator
    resolver.seedUser({
      id: 7,
      firstName: 'Admin',
      lastName: 'Overseer',
      email: 'admin@careconnect.et',
      roleId: 6, // SYSTEM_ADMINISTRATOR
      roleName: 'SYSTEM_ADMINISTRATOR'
    });
  });

  test('1. REFERRAL_SUBMITTED resolves only active triage staff at target hospital', async () => {
    const referral = {
      id: 'ref-100',
      originating_facility_id: 'fac-hc-01',
      receiving_facility_id: 'fac-hosp-01'
    };

    const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);

    assert.equal(recipients.length, 1);
    assert.equal(recipients[0].userId, 2); // Dawit at HOSP-01
    assert.equal(recipients[0].facilityId, 'fac-hosp-01');
  });

  test('2. Strict facility tenancy: Staff at Hospital B never receive Hospital A referrals', async () => {
    const referral = {
      id: 'ref-101',
      originating_facility_id: 'fac-hc-01',
      receiving_facility_id: 'fac-hosp-01'
    };

    const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);
    const hospBRecipient = recipients.find(r => r.userId === 3);

    assert.equal(hospBRecipient, undefined, 'Hospital B staff must not receive Hospital A referral alerts');
  });

  test('3. Excludes inactive and soft-deleted accounts from notification delivery', async () => {
    const referral = {
      id: 'ref-102',
      originating_facility_id: 'fac-hc-01',
      receiving_facility_id: 'fac-hosp-01'
    };

    const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_SUBMITTED);
    const userIds = recipients.map(r => r.userId);

    assert.ok(!userIds.includes(4), 'Inactive account must be excluded');
    assert.ok(!userIds.includes(5), 'Deleted account must be excluded');
  });

  test('4. REFERRAL_ACCEPTED resolves referring clinician and health centre staff', async () => {
    const referral = {
      id: 'ref-103',
      originating_facility_id: 'fac-hc-01',
      receiving_facility_id: 'fac-hosp-01',
      referring_clinician_id: 1
    };

    const recipients = await resolver.resolveReferralRecipients(referral, NOTIFICATION_TYPES.REFERRAL_ACCEPTED);

    assert.equal(recipients.length, 1);
    assert.equal(recipients[0].userId, 1);
    assert.equal(recipients[0].facilityId, 'fac-hc-01');
  });

  test('5. Operational escalation incorporates hospital leads and system admins for level 2+', async () => {
    const level1Ref = {
      id: 'ref-esc-1',
      originating_facility_id: 'fac-hc-01',
      receiving_facility_id: 'fac-hosp-01',
      escalation_level: 1
    };

    const level1Recipients = await resolver.resolveReferralRecipients(level1Ref, NOTIFICATION_TYPES.ESCALATION_CREATED);
    assert.equal(level1Recipients.some(r => r.userId === 2), true); // Hospital lead
    assert.equal(level1Recipients.some(r => r.userId === 7), false); // No admin for level 1

    const level2Ref = {
      ...level1Ref,
      escalation_level: 2
    };

    const level2Recipients = await resolver.resolveReferralRecipients(level2Ref, NOTIFICATION_TYPES.ESCALATION_CREATED);
    assert.equal(level2Recipients.some(r => r.userId === 2), true); // Hospital lead
    assert.equal(level2Recipients.some(r => r.userId === 7), true); // Administrator included
  });

  test('6. Transport event resolves assigned coordinators and receiving hospital on delay', async () => {
    const transportRecord = {
      id: 'trans-001',
      managing_facility_id: 'fac-trans-01',
      destination_facility_id: 'fac-hosp-01',
      coordinator_user_id: 6
    };

    const recipients = await resolver.resolveTransportRecipients(
      transportRecord,
      NOTIFICATION_TYPES.TRANSPORT_DELAY_REPORTED
    );

    const userIds = recipients.map(r => r.userId);
    assert.ok(userIds.includes(6), 'Transport coordinator must be resolved');
    assert.ok(userIds.includes(2), 'Destination hospital triage must be alerted of transport delay');
  });
});
