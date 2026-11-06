import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Patient Identification & Duplicate Detection Suite — Commit 044', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const clinician = await UserModel.create({
    email: 'dr.marta@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Marta',
    lastName: 'Girma',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const clinicianToken = generateAccessToken(clinician);

  // Seed two potential duplicate patient records (similar patronymic names, same woreda, same age)
  const patient1 = await patientRepository.create({
    first_name: 'Tariku',
    father_name: 'Lemma',
    grandfather_name: 'Desta',
    gender: 'MALE',
    date_of_birth: '1985-02-14',
    age_years: 41,
    phone_number: '+251911880011',
    national_id: 'FAYDA-TARIKU-01',
    region: 'Addis Ababa',
    woreda: 'Bole Woreda 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  const patient2 = await patientRepository.create({
    first_name: 'Tariku',
    father_name: 'Lemma',
    grandfather_name: 'Desta',
    gender: 'MALE',
    age_years: 41,
    phone_number: '+251911880011', // same phone and name, registered earlier without Fayda ID
    region: 'Addis Ababa',
    woreda: 'Bole Woreda 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  await t.test('GET /api/v1/patients/identify discovers match candidates using multiple signals', async () => {
    const res = await request(app).get('/api/v1/patients/identify?national_id=FAYDA-TARIKU-01', {
      headers: { Authorization: `Bearer ${clinicianToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.candidates.length > 0);
    const topMatch = res.body.data.candidates[0];
    assert.equal(topMatch.patient.id, patient1.id);
    assert.equal(topMatch.match_score, 100);
    assert.equal(topMatch.match_category, 'CONFIRMED_MATCH');
    assert.ok(topMatch.match_signals.includes('EXACT_NATIONAL_ID_MATCH'));
  });

  await t.test('GET /api/v1/patients/:patientId/possible-duplicates identifies duplicate without matching self', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient1.id}/possible-duplicates`, {
      headers: { Authorization: `Bearer ${clinicianToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.candidates.length >= 1);
    const duplicateCandidate = res.body.data.candidates.find((c) => c.patient.id === patient2.id);
    assert.ok(duplicateCandidate);
    assert.ok(duplicateCandidate.match_score >= 60);
    // Crucial check: the querying patient must never be in their own duplicate candidates
    assert.ok(!res.body.data.candidates.some((c) => c.patient.id === patient1.id));
  });

  await t.test('POST /api/v1/patients/:patientId/duplicate-review records clinical review without auto-merging', async () => {
    const res = await request(app).post(`/api/v1/patients/${patient1.id}/duplicate-review`, {
      candidate_patient_id: patient2.id,
      review_status: 'CONFIRMED_MATCH',
      notes: 'Reviewed in person: same individual registered under separate visit without Fayda ID.',
      match_score: 95
    }, {
      headers: { Authorization: `Bearer ${clinicianToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.review.review_status, 'CONFIRMED_MATCH');
    assert.equal(res.body.data.review.candidate_patient_id, patient2.id);

    // Verify patient records remain independent (NO automatic destructive merge)
    const p1 = await patientRepository.findById(patient1.id);
    const p2 = await patientRepository.findById(patient2.id);
    assert.equal(p1.status, 'ACTIVE');
    assert.equal(p2.status, 'ACTIVE');
  });

  await t.test('POST /api/v1/patients/merge-requests submits formal merge request with clinical justification', async () => {
    const res = await request(app).post('/api/v1/patients/merge-requests', {
      source_patient_id: patient2.id,
      target_patient_id: patient1.id,
      reason: 'Confirmed duplicate patient identity verified via Kebele administration residency book'
    }, {
      headers: { Authorization: `Bearer ${clinicianToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.mergeRequest.source_patient_id, patient2.id);
    assert.equal(res.body.data.mergeRequest.target_patient_id, patient1.id);
    assert.equal(res.body.data.mergeRequest.status, 'PENDING');
  });

  await t.test('POST /api/v1/patients/merge-requests rejects merge request when source equals target', async () => {
    const res = await request(app).post('/api/v1/patients/merge-requests', {
      source_patient_id: patient1.id,
      target_patient_id: patient1.id,
      reason: 'Attempting invalid self-merge operation'
    }, {
      headers: { Authorization: `Bearer ${clinicianToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some((d) => d.message.includes('Cannot merge a patient record into itself')));
  });
});
