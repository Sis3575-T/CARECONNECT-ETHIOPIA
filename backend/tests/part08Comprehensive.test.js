import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import coordinationRepository from '../src/repositories/coordinationRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import facilityRepository from '../src/repositories/facilityRepository.js';
import UserModel from '../src/models/userModel.js';
import securityAuditService from '../src/services/securityAuditService.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Part 08 Comprehensive Verification Suite — Advanced Referral Workflow, Escalation & Coordination', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Actor 1: System Administrator
  const admin = await UserModel.create({
    email: 'admin.coord@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tewodros',
    lastName: 'Kassa',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  // Actor 2: Health Centre Staff (Bole Health Centre)
  const hcStaff = await UserModel.create({
    email: 'hc.coord@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hanna',
    lastName: 'Mulugeta',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  // Actor 3: Hospital Liaison / Clinician (Tikur Anbessa Specialized Hospital)
  const hospDoctor1 = await UserModel.create({
    email: 'doc.tikur@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Girma',
    roleId: 2, // HOSPITAL_LIAISON
    facilityId: 'fac-hosp-tikur-01'
  });

  // Actor 4: Hospital Liaison (St. Paul Hospital Millennium Medical College)
  const hospDoctor2 = await UserModel.create({
    email: 'doc.stpaul@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Bethlehem',
    lastName: 'Kebede',
    roleId: 2, // HOSPITAL_LIAISON
    facilityId: 'fac-hosp-stpaul-02'
  });

  // Actor 5: Transport Coordinator
  const transportCoord = await UserModel.create({
    email: 'trans.coord@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Biruk',
    lastName: 'Alemu',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const adminToken = generateAccessToken(admin);
  const hcToken = generateAccessToken(hcStaff);
  const hospToken1 = generateAccessToken(hospDoctor1);
  const hospToken2 = generateAccessToken(hospDoctor2);
  const transToken = generateAccessToken(transportCoord);

  // Setup patient
  const patient = await patientRepository.create({
    first_name: 'Abebe',
    father_name: 'Bikila',
    grand_father_name: 'Desta',
    gender: 'MALE',
    date_of_birth: '1975-04-12',
    age_years: 49,
    region: 'Addis Ababa',
    woreda: 'Bole 02',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let referralId = null;
  let customPolicyId = null;
  let infoRequestId = null;
  let escalationId = null;

  await t.test('Phase 1: Administrator establishes custom SLA Response Policy', async () => {
    const res = await request(app).post('/api/v1/referral-policies', {
      name: 'Cardiology Urgent Referral Protocol',
      description: 'SLA policy for emergency and urgent cardiothoracic referrals',
      priority: 'URGENT',
      facility_id: 'fac-hosp-tikur-01',
      acknowledgement_window_minutes: 45,
      decision_window_minutes: 120,
      escalation_threshold_minutes: 180,
      is_active: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.policy.acknowledgement_deadline_minutes, 45);
    customPolicyId = res.body.data.policy.id;
  });

  await t.test('Phase 2: Health Centre registers and submits urgent referral with policy attachment', async () => {
    const createRes = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'URGENT',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Non-ST-Segment Elevation Myocardial Infarction (NSTEMI)',
      clinical_summary: '49yo male with 3-hour sub-sternal chest discomfort radiating to left jaw',
      reason_for_referral: 'Emergency cardiac catheterization & coronary angiography',
      required_specialty: 'Cardiology'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(createRes.status, 201);
    referralId = createRes.body.data.referral.id;

    const subRes = await request(app).post(`/api/v1/referrals/${referralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(subRes.status, 200);
    const submittedRef = subRes.body.data.referral;
    assert.equal(submittedRef.status, 'SUBMITTED');
    assert.ok(submittedRef.acknowledgement_deadline);
    assert.ok(submittedRef.decision_deadline);
    assert.equal(submittedRef.policy_id, customPolicyId);
  });

  await t.test('Phase 3: Receiving Hospital acknowledges referral', async () => {
    const ackRes = await request(app).post(`/api/v1/referrals/${referralId}/acknowledge`, {}, {
      headers: { Authorization: `Bearer ${hospToken1}` }
    });

    assert.equal(ackRes.status, 200);
    assert.equal(ackRes.body.data.referral.status, 'ACKNOWLEDGED');
    assert.ok(ackRes.body.data.referral.acknowledged_at);
  });

  await t.test('Phase 4: Hospital requests additional diagnostic info and Health Centre responds', async () => {
    // 4a. Hospital requests 12-lead ECG and initial troponin level
    const reqRes = await request(app).post(`/api/v1/referrals/${referralId}/information-requests`, {
      requested_information: 'Serial 12-lead ECG tracings and high-sensitivity Troponin-I bedside assay',
      clinical_reason: 'Confirm ischemic territory prior to catheterization lab activation'
    }, {
      headers: { Authorization: `Bearer ${hospToken1}` }
    });

    assert.equal(reqRes.status, 201);
    infoRequestId = reqRes.body.data.request.id;

    // Check referral transitioned to INFO_REQUESTED
    const refCheck = await referralRepository.findById(referralId);
    assert.equal(refCheck.status, 'INFO_REQUESTED');

    // 4b. Health centre staff responds with lab findings
    const respRes = await request(app).post(`/api/v1/referrals/${referralId}/information-requests/${infoRequestId}/respond`, {
      response_notes: 'ECG shows 1.5mm ST depression in V4-V6; Troponin-I elevated at 0.84 ng/mL. Aspirin 300mg administered.',
      supporting_document_ids: ['doc-ecg-001']
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(respRes.status, 200);
    assert.equal(respRes.body.data.request.request_status, 'RESPONDED');

    // Check referral automatically returned to SUBMITTED status
    const refAfter = await referralRepository.findById(referralId);
    assert.equal(refAfter.status, 'SUBMITTED');
  });

  await t.test('Phase 5: Health Centre records communication follow-up interaction', async () => {
    const fuRes = await request(app).post(`/api/v1/referrals/${referralId}/follow-ups`, {
      communication_channel: 'PHONE_CALL',
      outcome: 'CONNECTED',
      reason_or_notes: 'Discussed with cath lab nursing supervisor. Bed assignment in progress.'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(fuRes.status, 201);
    assert.equal(fuRes.body.data.followUp.channel_delivery_status, 'MANUAL_RECORD');

    const updatedRef = await referralRepository.findById(referralId);
    assert.equal(updatedRef.followup_count, 1);
    assert.ok(updatedRef.last_followup_at);
  });

  await t.test('Phase 6: Cath lab capacity exhausted -> Human-managed reassignment to St. Paul Hospital', async () => {
    const reassignRes = await request(app).post(`/api/v1/referrals/${referralId}/reassignments`, {
      new_facility_id: 'fac-hosp-stpaul-02',
      reassignment_reason: 'INSUFFICIENT_CAPACITY',
      reassignment_notes: 'Tikur Anbessa catheterization suite undergoing emergency decontamination; redirected to St. Paul'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(reassignRes.status, 200);
    const reassignedRef = reassignRes.body.data.referral;
    assert.equal(reassignedRef.destination_facility_id, 'fac-hosp-stpaul-02');
    assert.equal(reassignedRef.status, 'ASSIGNED');
  });

  await t.test('Phase 7: Operational escalation triggers due to delayed response and is resolved', async () => {
    // 7a. Trigger escalation Level 2
    const escRes = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 2,
      escalation_condition: 'FACILITY_CAPACITY_EXHAUSTED',
      escalation_reason: 'Critical cardiac intervention window endangered by inter-facility transfer',
      target_role: 'MEDICAL_DIRECTOR'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(escRes.status, 201);
    escalationId = escRes.body.data.escalation.id;

    const ref = await referralRepository.findById(referralId);
    assert.equal(ref.escalation_level, 2);
    // Critical safeguard: Priority MUST remain unchanged!
    assert.equal(ref.priority, 'URGENT');

    // 7b. St. Paul medical director resolves escalation
    const resolveRes = await request(app).post(`/api/v1/escalations/${escalationId}/resolve`, {
      resolution_explanation: 'St. Paul CCU bed #4 reserved; interventional cardiologist scrubbed and ready'
    }, {
      headers: { Authorization: `Bearer ${hospToken2}` }
    });

    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.escalation.escalation_status, 'RESOLVED');

    const refAfterRes = await referralRepository.findById(referralId);
    assert.equal(refAfterRes.escalation_level, 0, 'Escalation level must reset to 0 upon full resolution');
  });

  await t.test('Phase 8: St. Paul hospital clinician accepts referral and confirms bed allocation', async () => {
    const acceptRes = await request(app).post(`/api/v1/referrals/${referralId}/accept`, {
      assigned_bed_type: 'ICU',
      acceptance_notes: 'Emergency cath lab prepped. Dispatch ambulance immediately.'
    }, {
      headers: { Authorization: `Bearer ${hospToken2}` }
    });

    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.data.referral.status, 'ACCEPTED');
    assert.equal(acceptRes.body.data.referral.assigned_bed_type, 'ICU');
  });

  await t.test('Phase 9: Delays & Exception Monitoring calculates milestones and manages exceptions', async () => {
    // Record artificial operational exception
    const ex = await coordinationRepository.recordException({
      referral_id: referralId,
      exception_type: 'CAPACITY_BOTTLENECK',
      severity: 'CRITICAL',
      target_deadline: new Date().toISOString(),
      elapsed_minutes: 42
    });

    // List exceptions
    const exList = await request(app).get('/api/v1/referral-exceptions?isResolved=false', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(exList.status, 200);
    const found = exList.body.data.exceptions.find((e) => e.id === ex.id);
    assert.ok(found);

    // Resolve exception
    const resEx = await request(app).post(`/api/v1/referral-exceptions/${ex.id}/resolve`, {
      resolution_notes: 'Alternative bed capacity confirmed at secondary facility'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resEx.status, 200);
    assert.equal(resEx.body.data.exception.is_resolved, true);
  });

  await t.test('Phase 10: Transport Coordinator accesses privacy-sanitized timeline and respects boundaries', async () => {
    // 10a. Fetch timeline
    const timelineRes = await request(app).get(`/api/v1/referrals/${referralId}/timeline`, {
      headers: { Authorization: `Bearer ${transToken}` }
    });

    assert.equal(timelineRes.status, 200);
    const timelineData = timelineRes.body.data.timeline;
    assert.equal(timelineData.is_redacted, true);
    assert.ok(timelineData.total_events >= 8);

    // Verify clinical notes are redacted
    for (const evt of timelineData.timeline) {
      if (evt.event_type === 'CLINICAL_DECISION') {
        assert.equal(evt.details.notes, '[Clinical details redacted for transport logistics]');
      }
    }

    // 10b. Transport coordinator blocked from modifying clinical priority
    const priorityRes = await request(app).patch(`/api/v1/referrals/${referralId}/priority`, {
      priority: 'EMERGENCY',
      reason: 'Driver opinion'
    }, {
      headers: { Authorization: `Bearer ${transToken}` }
    });
    assert.equal(priorityRes.status, 403);
  });
});
