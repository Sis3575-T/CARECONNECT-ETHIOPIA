import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import patientRepository from '../src/repositories/patientRepository.js';
import UserModel from '../src/models/userModel.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Patient Search & Facility Tenancy Isolation Suite — Commit 046', async (t) => {
  patientRepository.clearStore();
  UserModel.clearMockUsers();

  const hashedPassword = await hashPassword('SecurePassword123!');

  const boleStaff = await UserModel.create({
    email: 'bole.search@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tigist',
    lastName: 'Alemu',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const yekaStaff = await UserModel.create({
    email: 'yeka.search@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kassahun',
    lastName: 'Bekele',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-yeka-02'
  });

  const adminUser = await UserModel.create({
    email: 'admin.search@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'System',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const boleToken = generateAccessToken(boleStaff);
  const yekaToken = generateAccessToken(yekaStaff);
  const adminToken = generateAccessToken(adminUser);

  // Seed 3 patients at Bole Health Centre
  await patientRepository.create({
    first_name: 'Bereket',
    father_name: 'Tesfaye',
    gender: 'MALE',
    age_years: 30,
    phone_number: '+251911112233',
    region: 'Addis Ababa',
    woreda: 'Bole 03',
    registered_facility_id: 'fac-hc-bole-01'
  });

  await patientRepository.create({
    first_name: 'Bethelhem',
    father_name: 'Girma',
    gender: 'FEMALE',
    age_years: 26,
    phone_number: '+251911445566',
    region: 'Addis Ababa',
    woreda: 'Bole 05',
    registered_facility_id: 'fac-hc-bole-01'
  });

  await patientRepository.create({
    first_name: 'Daniel',
    father_name: 'Haile',
    gender: 'MALE',
    age_years: 40,
    phone_number: '+251911778899',
    region: 'Addis Ababa',
    woreda: 'Bole 01',
    registered_facility_id: 'fac-hc-bole-01'
  });

  // Seed 2 patients at Yeka Health Centre
  await patientRepository.create({
    first_name: 'Fikadu',
    father_name: 'Mekonnen',
    gender: 'MALE',
    age_years: 50,
    phone_number: '+251922112233',
    region: 'Addis Ababa',
    woreda: 'Yeka 08',
    registered_facility_id: 'fac-hc-yeka-02'
  });

  await patientRepository.create({
    first_name: 'Genet',
    father_name: 'Assefa',
    gender: 'FEMALE',
    age_years: 32,
    phone_number: '+251922445566',
    region: 'Amhara',
    woreda: 'Dessie Zuria',
    registered_facility_id: 'fac-hc-yeka-02'
  });

  await t.test('GET /api/v1/patients enforces facility isolation for Health Centre staff', async () => {
    // Bole staff queries all patients
    const resBole = await request(app).get('/api/v1/patients', {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(resBole.status, 200);
    assert.equal(resBole.body.success, true);
    assert.equal(resBole.body.meta.pagination.total, 3);
    assert.ok(resBole.body.data.every((p) => p.registered_facility_id === 'fac-hc-bole-01'));
    // Ensures Yeka patients are not leaked
    assert.ok(!resBole.body.data.some((p) => p.first_name === 'Fikadu'));

    // Yeka staff queries all patients
    const resYeka = await request(app).get('/api/v1/patients', {
      headers: { Authorization: `Bearer ${yekaToken}` }
    });

    assert.equal(resYeka.status, 200);
    assert.equal(resYeka.body.success, true);
    assert.equal(resYeka.body.meta.pagination.total, 2);
    assert.ok(resYeka.body.data.every((p) => p.registered_facility_id === 'fac-hc-yeka-02'));
  });

  await t.test('GET /api/v1/patients supports server-side pagination (page & limit)', async () => {
    const res = await request(app).get('/api/v1/patients?page=1&limit=2', {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.pagination.page, 1);
    assert.equal(res.body.meta.pagination.limit, 2);
    assert.equal(res.body.meta.pagination.total, 3);
    assert.equal(res.body.meta.pagination.totalPages, 2);
    assert.equal(res.body.meta.pagination.hasNext, true);
  });

  await t.test('GET /api/v1/patients filters by name search query', async () => {
    const res = await request(app).get('/api/v1/patients?search=Bereket', {
      headers: { Authorization: `Bearer ${boleToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.meta.pagination.total, 1);
    assert.equal(res.body.data[0].first_name, 'Bereket');
  });

  await t.test('GET /api/v1/patients allows Administrator to search across all healthcare facilities', async () => {
    const res = await request(app).get('/api/v1/patients', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.meta.pagination.total, 5); // 3 Bole + 2 Yeka
  });

  await t.test('GET /api/v1/patients filters by regional geography', async () => {
    const res = await request(app).get('/api/v1/patients?region=Amhara', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.meta.pagination.total, 1);
    assert.equal(res.body.data[0].first_name, 'Genet');
    assert.equal(res.body.data[0].region, 'Amhara');
  });
});
