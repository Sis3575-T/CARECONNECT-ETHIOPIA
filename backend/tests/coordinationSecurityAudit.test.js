import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import coordinationRepository from '../src/repositories/coordinationRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import securityAuditService from '../src/services/securityAuditService.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Escalation Audit & Operational Safeguards Suite — Commit 063', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const admin = await UserModel.create({
    email: 'admin.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tewodros',
    lastName: 'Kassa',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  const hcStaffA = await UserModel.create({
    email: 'hca.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hanna',
    lastName: 'Mulugeta',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hcStaffB = await UserModel.create({
    email: 'hcb.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Almaz',
    lastName: 'Tadesse',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-akaki-02' // Different HC!
  });

  const hospClinicianX = await UserModel.create({
    email: 'hospx.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Girma',
    roleId: 2, // HOSPITAL_LIAISON
    facilityId: 'fac-hosp-tikur-01'
  });

  const hospClinicianY = await UserModel.create({
    email: 'hospy.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Bethlehem',
    lastName: 'Kebede',
    roleId: 2, // HOSPITAL_LIAISON
    facilityId: 'fac-hosp-stpaul-02' // Different Hospital!
  });

  const transportCoordinator = await UserModel.create({
    email: 'trans.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Biruk',
    lastName: 'Alemu',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const adminToken = generateAccessToken(admin);
  const hcTokenA = generateAccessToken(hcStaffA);
  const hcTokenB = generateAccessToken(hcStaffB);
  const hospTokenX = generateAccessToken(hospClinicianX);
  const hospTokenY = generateAccessToken(hospClinicianY);
  const transToken = generateAccessToken(transportCoordinator);

  const patient = await patientRepository.create({
    first_name: 'Solomon',
    father_name: 'Hailu',
    gender: 'MALE',
    age_years: 58,
    region: 'Addis Ababa',
    woreda: 'Bole 01',
    registered_facility_id: 'fac-hc-bole-01'
  });

  // Create and submit referral: Origin fac-hc-bole-01, Destination fac-hosp-tikur-01, Priority: ROUTINE
  const refRes = await request(app).post('/api/v1/referrals', {
    patient_id: patient.id,
    priority: 'ROUTINE',
    status: 'SUBMITTED',
    destination_facility_id: 'fac-hosp-tikur-01',
    primary_diagnosis: 'Chronic knee osteoarthritis stage III',
    clinical_summary: '58yo male with chronic knee pain refractory to paracetamol and physical therapy',
    reason_for_referral: 'Elective orthopedic joint consultation',
    required_specialty: 'Orthopedics'
  }, {
    headers: { Authorization: `Bearer ${hcTokenA}` }
  });

  assert.equal(refRes.status, 201);
  const referralId = refRes.body.data.referral.id;

  await t.test('1. Operational escalation NEVER changes clinical triage priority', async () => {
    // Escalate to Level 1
    const esc1 = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 1,
      escalation_condition: 'ACKNOWLEDGEMENT_DELAY',
      escalation_reason: 'Hospital liaison has not acknowledged referral within expected window',
      target_role: 'HOSPITAL_LIAISON'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(esc1.status, 201);

    // Escalate to Level 2
    const esc2 = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 2,
      escalation_condition: 'DECISION_WINDOW_ELAPSED',
      escalation_reason: 'Supervisor alerted for delayed surgical triage review',
      target_role: 'MEDICAL_DIRECTOR'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(esc2.status, 201);

    // Escalate to Level 3 (highest regional level)
    const esc3 = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 3,
      escalation_condition: 'FACILITY_CAPACITY_EXHAUSTED',
      escalation_reason: 'Regional coordinator review triggered due to facility congestion',
      target_role: 'SYSTEM_ADMIN'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(esc3.status, 201);

    // Inspect the referral: Clinical priority MUST remain strictly ROUTINE!
    const checkRes = await request(app).get(`/api/v1/referrals/${referralId}`, {
      headers: { Authorization: `Bearer ${hcTokenA}` }
    });
    assert.equal(checkRes.status, 200);
    assert.equal(checkRes.body.data.referral.priority, 'ROUTINE', 'Clinical priority must not be altered by operational escalation');
    assert.equal(checkRes.body.data.referral.escalation_level, 3, 'Operational escalation level must track highest active level');
  });

  await t.test('2. Overdue referrals are NEVER auto-rejected or auto-prescribed treatments', async () => {
    // Check delays endpoint
    const delayRes = await request(app).get(`/api/v1/referrals/${referralId}/delays`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(delayRes.status, 200);

    const ref = await referralRepository.findById(referralId);
    assert.notEqual(ref.status, 'REJECTED');
    assert.notEqual(ref.status, 'CANCELLED');
    assert.equal(ref.provisional_treatment_given, null);
    assert.equal(ref.rejection_reason, null);
  });

  await t.test('3. Cross-facility tenancy boundaries are strictly enforced with 403 Forbidden', async () => {
    // Health Centre B cannot record follow-up on Health Centre A's referral
    const unauthorizedFollowUp = await request(app).post(`/api/v1/referrals/${referralId}/follow-ups`, {
      communication_channel: 'PHONE_CALL',
      outcome: 'CONNECTED',
      reason_or_notes: 'Cross-facility check attempt'
    }, {
      headers: { Authorization: `Bearer ${hcTokenB}` }
    });
    assert.equal(unauthorizedFollowUp.status, 403);

    // Hospital Y clinician cannot request info for referral assigned to Hospital X
    const unauthorizedInfoReq = await request(app).post(`/api/v1/referrals/${referralId}/information-requests`, {
      requested_information: 'X-ray knee AP and lateral views',
      clinical_reason: 'Review joint space narrowing'
    }, {
      headers: { Authorization: `Bearer ${hospTokenY}` }
    });
    assert.equal(unauthorizedInfoReq.status, 403);

    // Hospital Y clinician cannot escalate referral assigned to Hospital X
    const unauthorizedEsc = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 1,
      escalation_condition: 'OTHER',
      escalation_reason: 'Inter-hospital unauthorized escalation'
    }, {
      headers: { Authorization: `Bearer ${hospTokenY}` }
    });
    assert.equal(unauthorizedEsc.status, 403);
  });

  await t.test('4. Transport coordinators cannot reassign hospitals or alter clinical priority', async () => {
    // Transport coordinator cannot reassign hospital
    const reassignRes = await request(app).post(`/api/v1/referrals/${referralId}/reassignments`, {
      new_facility_id: 'fac-hosp-stpaul-02',
      reassignment_reason: 'SERVICE_UNAVAILABLE',
      reassignment_notes: 'Transport coordinator trying to change hospital'
    }, {
      headers: { Authorization: `Bearer ${transToken}` }
    });
    assert.equal(reassignRes.status, 403);

    // Transport coordinator cannot alter clinical priority
    const priorityRes = await request(app).patch(`/api/v1/referrals/${referralId}/priority`, {
      priority: 'EMERGENCY',
      reason: 'Driver believes patient is deteriorating'
    }, {
      headers: { Authorization: `Bearer ${transToken}` }
    });
    assert.equal(priorityRes.status, 403);
  });

  await t.test('5. Operational audit logs record coordination events without credential leakage', async () => {
    const auditRes = await request(app).get('/api/v1/audit?limit=100', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body.data.logs));

    const events = auditRes.body.data.logs;
    const eventNames = events.map((e) => e.event_name);

    assert.ok(eventNames.includes('REFERRAL_ESCALATED'));

    // Check for credential leakage across all events
    for (const evt of events) {
      const serialized = JSON.stringify(evt);
      assert.ok(!serialized.includes('password_hash'));
      assert.ok(!serialized.includes('SecurePassword123!'));
    }
  });
});
