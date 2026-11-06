import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import patientService from '../src/services/patientService.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Patient Management Domain Suite — Commit 041', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const hcStaffUser = await UserModel.create({
    email: 'tigist.hc@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const transportUser = await UserModel.create({
    email: 'kassahun.trans@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kassahun',
    lastName: 'Bekele',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: null
  });

  const adminUser = await UserModel.create({
    email: 'admin.patient@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'System',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const hcStaffToken = generateAccessToken(hcStaffUser);
  const transportToken = generateAccessToken(transportUser);
  const adminToken = generateAccessToken(adminUser);

  await t.test('GET /api/v1/patients rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/patients');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('PatientRepository correctly creates and retrieves Ethiopian patronymic records', async () => {
    const created = await patientRepository.create({
      first_name: 'Almaz',
      father_name: 'Kebede',
      grandfather_name: 'Tadesse',
      gender: 'FEMALE',
      date_of_birth: '1995-04-12',
      age_years: 31,
      national_id: 'FAYDA-987654321',
      phone_number: '+251911223344',
      region: 'Addis Ababa',
      woreda: 'Bole Woreda 03',
      registered_facility_id: 'fac-hc-bole-01',
      blood_type: 'O+'
    });

    assert.ok(created.id.startsWith('ETH-PAT-'));
    assert.equal(created.first_name, 'Almaz');
    assert.equal(created.father_name, 'Kebede');
    assert.equal(created.grandfather_name, 'Tadesse');

    // Retrieve by ID
    const foundById = await patientRepository.findById(created.id);
    assert.ok(foundById);
    assert.equal(foundById.id, created.id);

    // Retrieve by Fayda National ID
    const foundByNatId = await patientRepository.findByNationalId('FAYDA-987654321');
    assert.ok(foundByNatId);
    assert.equal(foundByNatId.id, created.id);
  });

  await t.test('Patient registration supports missing phone numbers (Ethiopian operational reality)', async () => {
    const created = await patientService.registerPatient(
      {
        first_name: 'Chala',
        father_name: 'Gudeta',
        gender: 'MALE',
        age_years: 45,
        region: 'Oromia',
        woreda: 'Adama Rural Woreda',
        registered_facility_id: 'fac-hc-bole-01'
        // Notice: phone_number is omitted completely
      },
      hcStaffUser
    );

    assert.ok(created.id);
    assert.equal(created.phone_number, null);
    assert.equal(created.first_name, 'Chala');
    assert.equal(created.father_name, 'Gudeta');
    assert.equal(created.full_name, 'Chala Gudeta');
  });

  await t.test('Patient registration supports estimated age when exact DOB is unavailable', async () => {
    const created = await patientService.registerPatient(
      {
        first_name: 'Fatuma',
        father_name: 'Hassen',
        gender: 'FEMALE',
        age_years: 68, // Rural elderly patient with no birth certificate
        region: 'Afar',
        woreda: 'Semera Woreda'
      },
      hcStaffUser
    );

    assert.ok(created.id);
    assert.equal(created.date_of_birth, null);
    assert.equal(created.age_years, 68);
    assert.equal(created.is_dob_estimated, true);
  });

  await t.test('PatientService enforces role-based privacy sanitization', async () => {
    const rawPatient = await patientRepository.create({
      first_name: 'Bereket',
      father_name: 'Tesfaye',
      gender: 'MALE',
      date_of_birth: '1988-08-20',
      age_years: 38,
      phone_number: '+251911998877',
      region: 'Amhara',
      woreda: 'Bahir Dar Zuria',
      blood_type: 'B+',
      known_allergies: 'Penicillin severe anaphylaxis',
      chronic_conditions: 'Type 2 Diabetes',
      registered_facility_id: 'fac-hc-bole-01'
    });

    // 1. Health Centre Staff sees complete demographic and clinical profile
    const hcSanitized = patientService.sanitizePatient(rawPatient, hcStaffUser);
    assert.equal(hcSanitized.blood_type, 'B+');
    assert.equal(hcSanitized.known_allergies, 'Penicillin severe anaphylaxis');
    assert.equal(hcSanitized.chronic_conditions, 'Type 2 Diabetes');

    // 2. Transport Coordinator receives only minimum journey-relevant details
    const transSanitized = patientService.sanitizePatient(rawPatient, transportUser);
    assert.equal(transSanitized.full_name, 'Bereket Tesfaye');
    assert.equal(transSanitized.woreda, 'Bahir Dar Zuria');
    assert.equal(transSanitized.blood_type, undefined);
    assert.equal(transSanitized.known_allergies, undefined);
    assert.equal(transSanitized.chronic_conditions, undefined);

    // 3. System Administrator receives administrative fields without clinical records
    const adminSanitized = patientService.sanitizePatient(rawPatient, adminUser);
    assert.equal(adminSanitized.id, rawPatient.id);
    assert.equal(adminSanitized.full_name, 'Bereket Tesfaye');
    assert.equal(adminSanitized.blood_type, undefined);
    assert.equal(adminSanitized.known_allergies, undefined);
  });
});
