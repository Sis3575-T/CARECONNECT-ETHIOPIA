import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Patient Emergency Contact Management Suite — Commit 045', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const staff = await UserModel.create({
    email: 'contact.staff@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const staffToken = generateAccessToken(staff);

  // Seed patient
  const patient = await patientRepository.create({
    first_name: 'Binyam',
    father_name: 'Kebede',
    grandfather_name: 'Worku',
    gender: 'MALE',
    date_of_birth: '1990-03-22',
    age_years: 36,
    region: 'Addis Ababa',
    woreda: 'Bole Woreda 04',
    registered_facility_id: 'fac-hc-bole-01'
  });

  let createdContactId = null;

  await t.test('GET /api/v1/patients/:patientId/emergency-contacts retrieves initial contacts', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}/emergency-contacts`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.contacts));
  });

  await t.test('POST /api/v1/patients/:patientId/emergency-contacts adds primary contact successfully', async () => {
    const res = await request(app).post(`/api/v1/patients/${patient.id}/emergency-contacts`, {
      full_name: 'Sara Kebede Worku',
      relationship: 'SIBLING',
      phone_number: '+251911334477',
      alternate_phone: '+251922334488',
      address_text: 'Bole Subcity, Woreda 04, House 120',
      is_primary_contact: true
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.contact.full_name, 'Sara Kebede Worku');
    assert.equal(res.body.data.contact.relationship, 'SIBLING');
    assert.equal(res.body.data.contact.phone_number, '+251911334477');
    assert.equal(res.body.data.contact.is_primary_contact, true);

    createdContactId = res.body.data.contact.id;
  });

  await t.test('POST /api/v1/patients/:patientId/emergency-contacts adds secondary/neighbor contact', async () => {
    const res = await request(app).post(`/api/v1/patients/${patient.id}/emergency-contacts`, {
      full_name: 'Mulugeta Bekele',
      relationship: 'NEIGHBOR',
      phone_number: '+251933557799',
      is_primary_contact: false
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.contact.full_name, 'Mulugeta Bekele');
    assert.equal(res.body.data.contact.relationship, 'NEIGHBOR');
    assert.equal(res.body.data.contact.is_primary_contact, false);
  });

  await t.test('PATCH /api/v1/patients/:patientId/emergency-contacts/:contactId updates contact phone and address', async () => {
    const res = await request(app).patch(`/api/v1/patients/${patient.id}/emergency-contacts/${createdContactId}`, {
      phone_number: '+251911999888',
      address_text: 'Bole Subcity, Woreda 04, House 125 (Relocated)'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.contact.phone_number, '+251911999888');
    assert.equal(res.body.data.contact.address_text, 'Bole Subcity, Woreda 04, House 125 (Relocated)');
  });

  await t.test('POST /api/v1/patients/:patientId/emergency-contacts rejects invalid phone with 400', async () => {
    const res = await request(app).post(`/api/v1/patients/${patient.id}/emergency-contacts`, {
      full_name: 'Invalid Contact',
      relationship: 'FAMILY',
      phone_number: '123' // too short, invalid phone format
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some((d) => d.field === 'phone_number'));
  });

  await t.test('DELETE /api/v1/patients/:patientId/emergency-contacts/:contactId removes contact safely', async () => {
    const res = await request(app).delete(`/api/v1/patients/${patient.id}/emergency-contacts/${createdContactId}`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify contact is no longer returned
    const listRes = await request(app).get(`/api/v1/patients/${patient.id}/emergency-contacts`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.ok(!listRes.body.data.contacts.some((c) => String(c.id) === String(createdContactId)));
  });
});
