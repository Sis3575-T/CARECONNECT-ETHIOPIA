import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Patient Profile & Correction Management Suite — Commit 043', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const staffBole = await UserModel.create({
    email: 'staff.bole@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const staffYeka = await UserModel.create({
    email: 'staff.yeka@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dawit',
    lastName: 'Kassahun',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-yeka-02'
  });

  const adminUser = await UserModel.create({
    email: 'admin.corrections@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Admin',
    lastName: 'Oversight',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const boleToken = generateAccessToken(staffBole);
  const yekaToken = generateAccessToken(staffYeka);
  const adminToken = generateAccessToken(adminUser);

  // Seed patient at Bole Health Centre
  const patient = await patientRepository.create({
    first_name: 'Worknesh',
    father_name: 'Haile',
    grandfather_name: 'Mariam',
    gender: 'FEMALE',
    date_of_birth: '1992-09-10',
    age_years: 34,
    phone_number: '+251911334455',
    region: 'Addis Ababa',
    woreda: 'Bole Woreda 05',
    registered_facility_id: 'fac-hc-bole-01',
    status: 'ACTIVE'
  });

  await t.test('GET /api/v1/patients/:patientId retrieves patient profile for facility staff', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.patient.id, patient.id);
    assert.equal(res.body.data.patient.full_name, 'Worknesh Haile Mariam');
    assert.equal(res.body.data.patient.status, 'ACTIVE');
  });

  await t.test('GET /api/v1/patients/:patientId blocks cross-facility staff with 403 Forbidden', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}`, {
      headers: { Authorization: `Bearer ${yekaToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('different healthcare facility'));
  });

  await t.test('PATCH /api/v1/patients/:patientId updates demographics for authorized staff', async () => {
    const res = await request(app).patch(`/api/v1/patients/${patient.id}`, {
      phone_number: '+251922001122',
      woreda: 'Bole Woreda 07',
      is_pregnant: true
    }, {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.patient.phone_number, '+251922001122');
    assert.equal(res.body.data.patient.woreda, 'Bole Woreda 07');
    assert.equal(res.body.data.patient.is_pregnant, true);
  });

  await t.test('PATCH /api/v1/patients/:patientId blocks cross-facility updates with 403 Forbidden', async () => {
    const res = await request(app).patch(`/api/v1/patients/${patient.id}`, {
      phone_number: '+251999887766'
    }, {
      headers: { Authorization: `Bearer ${yekaToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('PATCH /api/v1/patients/:patientId/status transitions lifecycle to DECEASED with reason', async () => {
    const res = await request(app).patch(`/api/v1/patients/${patient.id}/status`, {
      status: 'DECEASED',
      reason: 'Confirmed clinical death certificate issued by attending physician'
    }, {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.patient.status, 'DECEASED');

    // Verify status was persisted in repository
    const refreshed = await patientRepository.findById(patient.id);
    assert.equal(refreshed.status, 'DECEASED');
  });

  await t.test('POST /api/v1/patients/:patientId/corrections records demographic corrections history', async () => {
    const res = await request(app).post(`/api/v1/patients/${patient.id}/corrections`, {
      field_name: 'grandfather_name',
      old_value: 'Mariam',
      new_value: 'Woldemariam',
      reason: 'Official correction based on revised Kebele resident identity booklet'
    }, {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.correction.field_name, 'grandfather_name');
    assert.equal(res.body.data.correction.new_value, 'Woldemariam');
    assert.equal(res.body.data.correction.reason, 'Official correction based on revised Kebele resident identity booklet');

    // Verify patient profile reflects the correction
    const updatedPatient = await patientRepository.findById(patient.id);
    assert.equal(updatedPatient.grandfather_name, 'Woldemariam');
  });

  await t.test('GET /api/v1/patients/:patientId/history retrieves chronological audit log of corrections', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}/history`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.corrections));
    assert.ok(res.body.data.corrections.length >= 2); // status change and grandfather_name correction
    assert.ok(res.body.data.corrections.some((c) => c.field_name === 'grandfather_name'));
  });
});
