import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Secure Patient Registration Suite — Commit 042', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaffUser = await UserModel.create({
    email: 'tigist.registration@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const unaffiliatedStaff = await UserModel.create({
    email: 'unaffiliated@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Abebe',
    lastName: 'Bikila',
    roleId: 1, // HEALTH_CENTRE_STAFF with NO facility
    facilityId: null
  });

  const hcToken = generateAccessToken(hcStaffUser);
  const unaffiliatedToken = generateAccessToken(unaffiliatedStaff);

  await t.test('POST /api/v1/patients registers patient successfully with standardized ID and facility', async () => {
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'Hiwot',
      father_name: 'Desta',
      grandfather_name: 'Mekonnen',
      gender: 'FEMALE',
      date_of_birth: '1998-05-15',
      phone_number: '+251911445566',
      national_id: 'FAYDA-REG-1001',
      region: 'Addis Ababa',
      subcity_zone: 'Bole',
      woreda: 'Woreda 03',
      kebele: 'Kebele 08',
      blood_type: 'A+',
      is_pregnant: true,
      edd_date: '2027-01-20',
      emergency_contact_name: 'Desta Mekonnen',
      emergency_contact_phone: '+251911778899',
      emergency_contact_relation: 'PARENT'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.patient.id.startsWith('ETH-PAT-'));
    assert.equal(res.body.data.patient.first_name, 'Hiwot');
    assert.equal(res.body.data.patient.father_name, 'Desta');
    assert.equal(res.body.data.patient.grandfather_name, 'Mekonnen');
    assert.equal(res.body.data.patient.full_name, 'Hiwot Desta Mekonnen');
    assert.equal(res.body.data.patient.registered_facility_id, 'fac-hc-bole-01');
    assert.equal(res.body.data.patient.is_pregnant, true);

    // Verify identifiers and emergency contacts were created in database/repository
    const inDb = await patientRepository.findById(res.body.data.patient.id);
    assert.ok(inDb.identifiers.some((i) => i.identifier_value === 'FAYDA-REG-1001'));
    assert.ok(inDb.emergency_contacts.some((c) => c.full_name === 'Desta Mekonnen'));
  });

  await t.test('POST /api/v1/patients accepts registration without phone number', async () => {
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'Solomon',
      father_name: 'Tiruneh',
      gender: 'MALE',
      age_years: 52,
      region: 'Oromia',
      woreda: 'Sebeta Woreda'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.patient.phone_number, null);
    assert.equal(res.body.data.patient.age_years, 52);
    assert.equal(res.body.data.patient.is_dob_estimated, true);
  });

  await t.test('POST /api/v1/patients rejects registration when staff has no assigned facility', async () => {
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'Kalkidan',
      father_name: 'Zeleke',
      gender: 'FEMALE',
      age_years: 25,
      region: 'Addis Ababa'
    }, {
      headers: { Authorization: `Bearer ${unaffiliatedToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.ok(res.body.error.message.includes('facility'));
  });

  await t.test('POST /api/v1/patients rejects duplicate Fayda National ID with 409 Conflict', async () => {
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'Duplicate',
      father_name: 'Applicant',
      gender: 'FEMALE',
      age_years: 30,
      national_id: 'FAYDA-REG-1001', // already registered in first test
      region: 'Addis Ababa'
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('already exists'));
  });

  await t.test('POST /api/v1/patients rejects invalid demographic data with 400 Validation Error', async () => {
    // Missing required father_name
    const res = await request(app).post('/api/v1/patients', {
      first_name: 'OnlyGivenName',
      gender: 'MALE',
      age_years: 20
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.some((d) => d.field === 'father_name'));
  });
});
