import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import FacilityRepository from '../src/repositories/facilityRepository.js';
import FacilityServiceRepository from '../src/repositories/facilityServiceRepository.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Facility Services & Department Management Suite — Commit 037', async (t) => {
  UserModel.clearMockUsers();
  FacilityRepository.clearStore();
  FacilityServiceRepository.clearStore();

  const hashedPassword = await hashPassword('AdminPass123!');

  // Seed Admin user (Role 6)
  const adminUser = await UserModel.create({
    email: 'admin.services@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Admin',
    lastName: 'Services',
    roleId: 6,
    facilityId: null
  });

  // Seed regular staff (Role 1)
  const staffUser = await UserModel.create({
    email: 'staff.services@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Staff',
    lastName: 'User',
    roleId: 1,
    facilityId: 'fac-hosp-services-01'
  });

  // Seed Facility
  await FacilityRepository.create({
    id: 'fac-hosp-services-01',
    name: 'Specialized Referral Hospital',
    facilityType: 'TERTIARY_HOSPITAL',
    region: 'Addis Ababa'
  });

  const adminToken = generateAccessToken(adminUser);
  const staffToken = generateAccessToken(staffUser);

  let serviceId = null;
  let departmentId = null;

  await t.test('POST /api/v1/facilities/:facilityId/services registers clinical service', async () => {
    const res = await request(app).post('/api/v1/facilities/fac-hosp-services-01/services', {
      serviceCode: 'OBSTETRICS_GYNECOLOGY',
      isAvailable: true,
      hasSpecialistOnDuty: true,
      operatingHours: '24/7',
      notes: 'High-risk surgical deliveries and emergency C-section'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.service);
    assert.equal(res.body.data.service.service_code, 'OBSTETRICS_GYNECOLOGY');

    serviceId = res.body.data.service.id;
  });

  await t.test('POST /api/v1/facilities/:facilityId/services rejects duplicate service assignment with 409 CONFLICT', async () => {
    const res = await request(app).post('/api/v1/facilities/fac-hosp-services-01/services', {
      serviceCode: 'OBSTETRICS_GYNECOLOGY'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('already registered'));
  });

  await t.test('POST /api/v1/facilities/:facilityId/services rejects unauthorized staff with 403', async () => {
    const res = await request(app).post('/api/v1/facilities/fac-hosp-services-01/services', {
      serviceCode: 'PEDIATRICS'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('GET /api/v1/facilities/:facilityId/services lists all registered services', async () => {
    const res = await request(app).get('/api/v1/facilities/fac-hosp-services-01/services', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.services));
    assert.equal(res.body.data.services.length, 1);
  });

  await t.test('PATCH /api/v1/facilities/:facilityId/services/:serviceId updates specialist duty status', async () => {
    const res = await request(app).patch(`/api/v1/facilities/fac-hosp-services-01/services/${serviceId}`, {
      hasSpecialistOnDuty: false,
      notes: 'Specialist off duty; on-call coverage active'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service.has_specialist_on_duty, false);
  });

  await t.test('POST /api/v1/facilities/:facilityId/departments creates department', async () => {
    const res = await request(app).post('/api/v1/facilities/fac-hosp-services-01/departments', {
      name: 'Emergency & Acute Trauma',
      code: 'EMERGENCY_DEPT',
      phoneExtension: '104'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.department);
    assert.equal(res.body.data.department.code, 'EMERGENCY_DEPT');

    departmentId = res.body.data.department.id;
  });

  await t.test('POST /api/v1/facilities/:facilityId/departments rejects duplicate department code with 409 CONFLICT', async () => {
    const res = await request(app).post('/api/v1/facilities/fac-hosp-services-01/departments', {
      name: 'Duplicate Emergency',
      code: 'EMERGENCY_DEPT'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  await t.test('GET /api/v1/facilities/:facilityId/departments lists departments', async () => {
    const res = await request(app).get('/api/v1/facilities/fac-hosp-services-01/departments', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.departments));
    assert.equal(res.body.data.departments.length, 1);
  });

  await t.test('PATCH /api/v1/facilities/:facilityId/departments/:departmentId updates department', async () => {
    const res = await request(app).patch(`/api/v1/facilities/fac-hosp-services-01/departments/${departmentId}`, {
      phoneExtension: '105'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.department.phone_extension, '105');
  });

  await t.test('DELETE /api/v1/facilities/:facilityId/services/:serviceId removes clinical service', async () => {
    const res = await request(app).delete(`/api/v1/facilities/fac-hosp-services-01/services/${serviceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const checkRes = await request(app).get('/api/v1/facilities/fac-hosp-services-01/services', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.equal(checkRes.body.data.services.length, 0);
  });
});
