import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import FacilityRepository from '../src/repositories/facilityRepository.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Healthcare Facility Management Suite — Commit 035', async (t) => {
  UserModel.clearMockUsers();
  FacilityRepository.clearStore();

  const hashedPassword = await hashPassword('AdminPass123!');

  // Seed Admin user with 'facility:manage' (Role 6)
  const adminUser = await UserModel.create({
    email: 'facilityadmin@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Facility',
    lastName: 'Admin',
    roleId: 6,
    facilityId: null
  });

  // Seed Health Centre user without 'facility:manage'
  const staffUser = await UserModel.create({
    email: 'hcstaff@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Almaz',
    lastName: 'Bekele',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });

  const adminToken = generateAccessToken(adminUser);
  const staffToken = generateAccessToken(staffUser);

  await t.test('POST /api/v1/facilities creates new facility with optional GPS coordinates', async () => {
    const res = await request(app).post('/api/v1/facilities', {
      id: 'fac-hc-adama-01',
      name: 'Adama Primary Health Centre',
      facilityType: 'HEALTH_CENTRE',
      tier: 'PRIMARY',
      region: 'Oromia',
      woreda: 'Adama Woreda 03',
      totalBeds: 25,
      totalIcuBeds: 0,
      hasEmergencyDepartment: true
      // latitude and longitude intentionally omitted to verify optional GIS capability
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.facility);
    assert.equal(res.body.data.facility.id, 'fac-hc-adama-01');
    assert.equal(res.body.data.facility.name, 'Adama Primary Health Centre');
    assert.equal(res.body.data.facility.latitude, null);
    assert.equal(res.body.data.facility.longitude, null);
  });

  await t.test('POST /api/v1/facilities rejects duplicate facility ID with 409 CONFLICT', async () => {
    const res = await request(app).post('/api/v1/facilities', {
      id: 'fac-hc-adama-01', // duplicate ID
      name: 'Duplicate Health Centre',
      facilityType: 'HEALTH_CENTRE',
      region: 'Oromia'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('already exists'));
  });

  await t.test('POST /api/v1/facilities rejects unauthorized staff with 403', async () => {
    const res = await request(app).post('/api/v1/facilities', {
      id: 'fac-unauth-01',
      name: 'Unauthorized Facility Creation',
      facilityType: 'HEALTH_CENTRE',
      region: 'Amhara'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('GET /api/v1/facilities returns paginated facility list', async () => {
    const res = await request(app).get('/api/v1/facilities', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta.pagination);
    assert.ok(res.body.data.length >= 1);
  });

  await t.test('GET /api/v1/facilities/:facilityId returns facility details', async () => {
    const res = await request(app).get('/api/v1/facilities/fac-hc-adama-01', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.facility.id, 'fac-hc-adama-01');
    assert.equal(res.body.data.facility.region, 'Oromia');
  });

  await t.test('GET /api/v1/facilities/:facilityId returns 404 for unknown facility', async () => {
    const res = await request(app).get('/api/v1/facilities/fac-ghost-99', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  await t.test('PATCH /api/v1/facilities/:facilityId updates capacity and metadata', async () => {
    const res = await request(app).patch('/api/v1/facilities/fac-hc-adama-01', {
      totalBeds: 35,
      totalIcuBeds: 2,
      hasBloodBank: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.facility.total_beds, 35);
    assert.equal(res.body.data.facility.has_blood_bank, true);
  });

  await t.test('PATCH /api/v1/facilities/:facilityId/status deactivates facility non-destructively', async () => {
    const res = await request(app).patch('/api/v1/facilities/fac-hc-adama-01/status', {
      isActive: false
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.facility.is_active, false);

    // Verify facility still exists and was not deleted from database
    const verifyRes = await request(app).get('/api/v1/facilities/fac-hc-adama-01', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.data.facility.is_active, false);
  });
});
