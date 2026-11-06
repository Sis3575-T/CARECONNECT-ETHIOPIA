import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import FacilityRepository from '../src/repositories/facilityRepository.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Search, Filtering & Pagination Verification Suite — Commit 038', async (t) => {
  UserModel.clearMockUsers();
  FacilityRepository.clearStore();

  const hashedPassword = await hashPassword('SearchPass123!');

  // Seed Admin user
  const adminUser = await UserModel.create({
    email: 'admin.search@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Admin',
    lastName: 'Searcher',
    roleId: 6,
    facilityId: null
  });

  // Seed a diverse set of fictional users
  await UserModel.create({
    email: 'almaz.nurse@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Almaz',
    lastName: 'Kebede',
    phoneNumber: '+251911111111',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-search-hc-01'
  });

  await UserModel.create({
    email: 'bekele.doctor@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Bekele',
    lastName: 'Mamo',
    phoneNumber: '+251922222222',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-search-hosp-01'
  });

  await UserModel.create({
    email: 'chaltu.driver@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Chaltu',
    lastName: 'Tolessa',
    phoneNumber: '+251933333333',
    roleId: 5, // AMBULANCE_DRIVER
    facilityId: null
  });

  // Seed a diverse set of fictional facilities
  await FacilityRepository.create({
    id: 'fac-search-hc-01',
    name: 'Bole 17 Primary Health Centre',
    facilityType: 'HEALTH_CENTRE',
    tier: 'PRIMARY',
    region: 'Addis Ababa',
    woreda: 'Bole Woreda 17',
    totalBeds: 20
  });

  await FacilityRepository.create({
    id: 'fac-search-hosp-01',
    name: 'Hawassa Comprehensive Specialized Hospital',
    facilityType: 'TERTIARY_HOSPITAL',
    tier: 'TERTIARY',
    region: 'Sidama',
    woreda: 'Hawassa Central',
    totalBeds: 450
  });

  await FacilityRepository.create({
    id: 'fac-search-hosp-02',
    name: 'Jimma University Medical Center',
    facilityType: 'TERTIARY_HOSPITAL',
    tier: 'TERTIARY',
    region: 'Oromia',
    woreda: 'Jimma Town',
    totalBeds: 500
  });

  const adminToken = generateAccessToken(adminUser);

  await t.test('User search matches search term across first name, last name, and email', async () => {
    const res = await request(app).get('/api/v1/users?search=Almaz', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.some((u) => u.firstName === 'Almaz'));
    assert.ok(!res.body.data.some((u) => u.firstName === 'Bekele'));
  });

  await t.test('User search filters by roleId', async () => {
    const res = await request(app).get('/api/v1/users?roleId=5', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    for (const u of res.body.data) {
      assert.equal(u.roleId, 5);
    }
  });

  await t.test('User search enforces stable pagination structure', async () => {
    const res = await request(app).get('/api/v1/users?limit=2&page=1', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pagination.page, 1);
    assert.equal(res.body.meta.pagination.limit, 2);
    assert.ok(res.body.meta.pagination.total >= 4);
    assert.equal(res.body.data.length, 2);
  });

  await t.test('Facility search matches by name and woreda', async () => {
    const res = await request(app).get('/api/v1/facilities?search=Bole', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((f) => f.name.includes('Bole')));
    assert.ok(!res.body.data.some((f) => f.name.includes('Jimma')));
  });

  await t.test('Facility search filters by facilityType', async () => {
    const res = await request(app).get('/api/v1/facilities?type=HEALTH_CENTRE', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    for (const f of res.body.data) {
      assert.equal(f.facility_type, 'HEALTH_CENTRE');
    }
  });

  await t.test('Facility search filters by region', async () => {
    const res = await request(app).get('/api/v1/facilities?region=Sidama', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].region, 'Sidama');
  });

  await t.test('Facility pagination divides total records accurately into pages', async () => {
    const res = await request(app).get('/api/v1/facilities?limit=2&page=1', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.meta.pagination.limit, 2);
    assert.equal(res.body.meta.pagination.page, 1);
    assert.equal(res.body.meta.pagination.totalPages, 2);
    assert.equal(res.body.meta.pagination.hasNext, true);
  });

  await t.test('Search rejects invalid page or limit with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/facilities?limit=-5', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});
