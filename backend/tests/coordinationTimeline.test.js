import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import coordinationRepository from '../src/repositories/coordinationRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Referral Coordination Timeline & Communication Records Suite — Commit 062', async (t) => {
  coordinationRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const admin = await UserModel.create({
    email: 'admin.timeline@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tewodros',
    lastName: 'Kassa',
    roleId: 6, // SYSTEM_ADMIN
    facilityId: null
  });

  const hcStaff = await UserModel.create({
    email: 'hc.timeline@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hanna',
    lastName: 'Mulugeta',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const hospitalClinician = await UserModel.create({
    email: 'hosp.timeline@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Girma',
    roleId: 2, // HOSPITAL_LIAISON / CLINICIAN
    facilityId: 'fac-hosp-tikur-01'
  });

  const transportCoordinator = await UserModel.create({
    email: 'trans.timeline@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Biruk',
    lastName: 'Alemu',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const adminToken = generateAccessToken(admin);
  const hcToken = generateAccessToken(hcStaff);
  const hospToken = generateAccessToken(hospitalClinician);
  const transToken = generateAccessToken(transportCoordinator);

  const patient = await patientRepository.create({
    first_name: 'Almaz',
    father_name: 'Bekele',
    gender: 'FEMALE',
    age_years: 42,
    region: 'Addis Ababa',
    woreda: 'Bole 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let referralId = null;

  await t.test('1. Setup referral with full coordination history across actors', async () => {
    // 1a. Create and submit referral
    const createRes = await request(app).post('/api/v1/referrals', {
      patient_id: patient.id,
      priority: 'URGENT',
      destination_facility_id: 'fac-hosp-tikur-01',
      primary_diagnosis: 'Ectopic pregnancy suspected, acute lower abdominal tenderness',
      clinical_summary: '42yo female with 7 weeks amenorrhea and sharp unilateral pelvic pain',
      reason_for_referral: 'Urgent obstetrical evaluation and pelvic ultrasound',
      required_specialty: 'Obstetrics & Gynecology'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(createRes.status, 201);
    referralId = createRes.body.data.referral.id;

    const subRes = await request(app).post(`/api/v1/referrals/${referralId}/submit`, {}, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(subRes.status, 200);

    // 1b. Hospital clinician acknowledges
    const ackRes = await request(app).post(`/api/v1/referrals/${referralId}/acknowledge`, {}, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(ackRes.status, 200);

    // 1c. Hospital records additional info request
    const infoReqRes = await request(app).post(`/api/v1/referrals/${referralId}/information-requests`, {
      requested_information: 'Quantitative beta-hCG serum level and emergency haemoglobin count',
      clinical_reason: 'Assess hemodynamic stability and risk of rupture prior to surgical prep'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(infoReqRes.status, 201);
    const requestId = infoReqRes.body.data.request.id;

    // 1d. Health centre responds to information request
    const respondRes = await request(app).post(`/api/v1/referrals/${referralId}/information-requests/${requestId}/respond`, {
      response_notes: 'Serum beta-hCG is 4200 mIU/mL; point-of-care Hb is 11.2 g/dL. Patient is stable.',
      supporting_document_ids: ['doc-lab-hcg-001']
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(respondRes.status, 200);

    // 1e. Record follow-up communication
    const fuRes = await request(app).post(`/api/v1/referrals/${referralId}/follow-ups`, {
      communication_channel: 'PHONE_CALL',
      recipient_facility_id: 'fac-hosp-tikur-01',
      outcome: 'CONNECTED',
      reason_or_notes: 'Spoke directly with Dr. Dawit in OB triage. Bed being prepped.'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(fuRes.status, 201);

    // 1f. Trigger operational escalation Level 1
    const escRes = await request(app).post(`/api/v1/referrals/${referralId}/escalations`, {
      escalation_level: 1,
      escalation_condition: 'DECISION_WINDOW_ELAPSED',
      escalation_reason: 'Decision pending past SLA threshold for urgent pregnancy evaluation',
      target_role: 'HOSPITAL_LIAISON'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(escRes.status, 201);
    const escalationId = escRes.body.data.escalation.id;

    // 1g. Resolve the escalation
    const resEscRes = await request(app).post(`/api/v1/escalations/${escalationId}/resolve`, {
      resolution_explanation: 'OB GYN team mobilized and completed bed allocation'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resEscRes.status, 200);

    // 1h. Hospital accepts referral
    const acceptRes = await request(app).post(`/api/v1/referrals/${referralId}/accept`, {
      assigned_bed_type: 'SURGICAL_WARD',
      acceptance_notes: 'Emergency OB bed secured. Transfer patient immediately.'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });
    assert.equal(acceptRes.status, 200);
  });

  await t.test('2. GET /api/v1/referrals/:id/timeline aggregates all event categories in chronological order', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/timeline`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data.timeline;

    assert.equal(data.referral_id, referralId);
    assert.ok(data.total_events >= 7);
    assert.ok(Array.isArray(data.timeline));

    // Verify chronological ordering
    for (let i = 1; i < data.timeline.length; i++) {
      const prevTime = new Date(data.timeline[i - 1].timestamp).getTime();
      const currTime = new Date(data.timeline[i].timestamp).getTime();
      assert.ok(prevTime <= currTime, `Event ${i} (${data.timeline[i].event_type}) is earlier than event ${i-1}`);
    }

    // Verify diverse event types are present
    const eventTypes = data.timeline.map((e) => e.event_type);
    assert.ok(eventTypes.includes('STATUS_TRANSITION'));
    assert.ok(eventTypes.includes('INFO_REQUESTED'));
    assert.ok(eventTypes.includes('INFO_RESPONDED'));
    assert.ok(eventTypes.includes('COORDINATION_FOLLOWUP'));
    assert.ok(eventTypes.includes('OPERATIONAL_ESCALATION'));
    assert.ok(eventTypes.includes('ESCALATION_RESOLVED'));
    assert.ok(eventTypes.includes('CLINICAL_DECISION'));

    // Verify actor attribution
    const humanEvent = data.timeline.find((e) => e.event_type === 'COORDINATION_FOLLOWUP');
    assert.equal(humanEvent.actor_type, 'HUMAN');
    assert.ok(humanEvent.actor_user_id);

    const escalationEvent = data.timeline.find((e) => e.event_type === 'OPERATIONAL_ESCALATION');
    assert.equal(escalationEvent.actor_type, 'SYSTEM');
  });

  await t.test('3. Privacy Safeguard: Transport coordinator timeline redacts clinical and sensitive notes', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referralId}/timeline`, {
      headers: { Authorization: `Bearer ${transToken}` }
    });

    assert.equal(res.status, 200);
    const data = res.body.data.timeline;
    assert.equal(data.is_redacted, true);

    // Verify clinical decision notes are redacted
    const decisionEvent = data.timeline.find((e) => e.event_type === 'CLINICAL_DECISION');
    assert.ok(decisionEvent);
    assert.equal(decisionEvent.details.notes, '[Clinical details redacted for transport logistics]');

    // Verify info request confidential text is redacted
    const infoEvent = data.timeline.find((e) => e.event_type === 'INFO_REQUESTED');
    assert.ok(infoEvent);
    assert.equal(infoEvent.details.requestedInfo, '[Confidential medical inquiry]');
    assert.equal(infoEvent.details.reason, '[Clinical justification redacted]');

    // Verify info response clinical text is redacted
    const respEvent = data.timeline.find((e) => e.event_type === 'INFO_RESPONDED');
    assert.ok(respEvent);
    assert.equal(respEvent.details.responseNotes, '[Clinical response redacted]');
  });

  await t.test('4. GET /api/v1/referrals/:id/timeline returns 404 for unknown referral ID', async () => {
    const res = await request(app).get('/api/v1/referrals/nonexistent-ref-id/timeline', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 404);
  });
});
