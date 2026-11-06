import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import FacilityRepository from '../src/repositories/facilityRepository.js';
import AssignmentRepository from '../src/repositories/assignmentRepository.js';
import FacilityServiceRepository from '../src/repositories/facilityServiceRepository.js';
import SecurityAuditService from '../src/services/securityAuditService.js';
import SessionService from '../src/services/sessionService.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Part 05 Comprehensive Verification Suite — User, Facility & Role Management', async (t) => {
  UserModel.clearMockUsers();
  FacilityRepository.clearStore();
  AssignmentRepository.clearStore();
  FacilityServiceRepository.clearStore();
  SecurityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePass123!');

  // Seed test users across multiple roles
  const adminUser = await UserModel.create({
    email: 'admin.comp@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'System',
    lastName: 'Admin',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  const hcUser = await UserModel.create({
    email: 'hc.nurse.comp@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Almaz',
    lastName: 'Bekele',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-comp-hc-01'
  });

  const hospUser = await UserModel.create({
    email: 'hosp.doctor.comp@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Tadesse',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-comp-hosp-01'
  });

  const transportUser = await UserModel.create({
    email: 'driver.comp@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Yonas',
    lastName: 'Girma',
    roleId: 5, // AMBULANCE_DRIVER
    facilityId: null
  });

  const adminToken = generateAccessToken(adminUser);
  const hcToken = generateAccessToken(hcUser);
  const hospToken = generateAccessToken(hospUser);
  const transportToken = generateAccessToken(transportUser);

  // 1. Health-centre user cannot create administrator accounts
  await t.test('1. Health-centre user cannot create administrator or user accounts (403)', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'illegal.admin@careconnect.et',
      firstName: 'Illegal',
      lastName: 'Admin',
      roleId: 6
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  // 2. Hospital user cannot manage facilities
  await t.test('2. Hospital user cannot register or modify healthcare facilities (403)', async () => {
    const res = await request(app).post('/api/v1/facilities', {
      id: 'fac-illegal-01',
      name: 'Unauthorized Facility',
      facilityType: 'HEALTH_CENTRE',
      region: 'Addis Ababa'
    }, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  // 3. Transport coordinator cannot assign roles or manage users
  await t.test('3. Transport coordinator cannot assign roles (403)', async () => {
    const res = await request(app).post(`/api/v1/users/${hcUser.id}/roles`, {
      roleId: 6
    }, {
      headers: { Authorization: `Bearer ${transportToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  // 4. System administrator registers and manages facilities
  let facilityId = 'fac-comp-hosp-01';
  await t.test('4. System administrator registers facility with optional coordinates and updates details', async () => {
    const createRes = await request(app).post('/api/v1/facilities', {
      id: facilityId,
      name: 'Tikur Anbessa Specialized Hospital',
      facilityType: 'TERTIARY_HOSPITAL',
      tier: 'TERTIARY',
      region: 'Addis Ababa',
      woreda: 'Lideta 08',
      totalBeds: 800,
      totalIcuBeds: 50,
      hasBloodBank: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.data.facility.name, 'Tikur Anbessa Specialized Hospital');

    // Update facility
    const updateRes = await request(app).patch(`/api/v1/facilities/${facilityId}`, {
      totalBeds: 850
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.facility.total_beds, 850);
  });

  // 5. System administrator creates user & duplicate rejection
  let newStaffId = null;
  await t.test('5. System administrator creates user account and enforces duplicate email rejection', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'specialist.new@careconnect.et',
      firstName: 'Aster',
      lastName: 'Aweke',
      roleId: 2, // HOSPITAL_STAFF
      facilityId: facilityId
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.ok(res.body.data.user);
    newStaffId = res.body.data.user.id;

    // Duplicate check
    const dupRes = await request(app).post('/api/v1/users', {
      email: 'specialist.new@careconnect.et',
      firstName: 'Duplicate',
      lastName: 'Attempt',
      roleId: 2,
      facilityId: facilityId
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(dupRes.status, 409);
    assert.equal(dupRes.body.error.code, 'CONFLICT');
  });

  // 6. User profile updates and self-role change rejection
  await t.test('6. User cannot change their own role but admin can update details', async () => {
    // User tries to elevate self
    const selfRes = await request(app).patch(`/api/v1/users/${hcUser.id}`, {
      roleId: 6
    }, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(selfRes.status, 403);
    assert.equal(selfRes.body.error.code, 'FORBIDDEN');

    // Admin updates user details
    const adminRes = await request(app).patch(`/api/v1/users/${newStaffId}`, {
      jobTitle: 'Lead Clinical Coordinator'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.data.user.jobTitle, 'Lead Clinical Coordinator');
  });

  // 7. Account deactivation terminates active sessions immediately
  await t.test('7. Deactivated user sessions are immediately revoked', async () => {
    await SessionService.createSession(newStaffId, {
      headers: { 'user-agent': 'Browser-Client' }
    });

    const sessionsBefore = await SessionService.listSessions(newStaffId);
    assert.ok(sessionsBefore.length > 0);

    const deactRes = await request(app).patch(`/api/v1/users/${newStaffId}/status`, {
      isActive: false
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(deactRes.status, 200);
    assert.equal(deactRes.body.data.user.isActive, false);

    const sessionsAfter = await SessionService.listSessions(newStaffId);
    assert.equal(sessionsAfter.length, 0);
  });

  // 8. Staff facility assignments & uniqueness
  await t.test('8. Staff facility assignments and duplicate assignment prevention', async () => {
    const assignRes = await request(app).post(`/api/v1/users/${hospUser.id}/facilities`, {
      facilityId: facilityId,
      assignmentRole: 'Chief Surgeon',
      isPrimary: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(assignRes.status, 201);
    assert.equal(assignRes.body.data.assignment.facility_id, facilityId);

    // Duplicate active assignment
    const dupAssign = await request(app).post(`/api/v1/users/${hospUser.id}/facilities`, {
      facilityId: facilityId,
      assignmentRole: 'Senior Surgeon'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(dupAssign.status, 409);
    assert.equal(dupAssign.body.error.code, 'CONFLICT');
  });

  // 9. Clinical services & department management
  let serviceId = null;
  await t.test('9. Facility clinical services and departments management', async () => {
    const servRes = await request(app).post(`/api/v1/facilities/${facilityId}/services`, {
      serviceCode: 'NEUROSURGERY',
      isAvailable: true,
      hasSpecialistOnDuty: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(servRes.status, 201);
    serviceId = servRes.body.data.service.id;

    // Duplicate service check
    const dupServ = await request(app).post(`/api/v1/facilities/${facilityId}/services`, {
      serviceCode: 'NEUROSURGERY'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(dupServ.status, 409);

    // Create department
    const deptRes = await request(app).post(`/api/v1/facilities/${facilityId}/departments`, {
      name: 'Department of Neurosurgery',
      code: 'NEURO_SURG',
      phoneExtension: '201'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(deptRes.status, 201);
    assert.equal(deptRes.body.data.department.code, 'NEURO_SURG');
  });

  // 10. Search, filtering and pagination
  await t.test('10. Search, filtering and pagination across users and facilities', async () => {
    const userSearch = await request(app).get('/api/v1/users?search=Dawit', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(userSearch.status, 200);
    assert.ok(userSearch.body.data.some((u) => u.firstName.includes('Dawit')));

    const facSearch = await request(app).get('/api/v1/facilities?type=TERTIARY_HOSPITAL', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(facSearch.status, 200);
    assert.ok(facSearch.body.data.length >= 1);
  });

  // 11. Security Audit Trail Verification
  await t.test('11. Security audit trail records administrative operations without credential exposure', async () => {
    const logsRes = await request(app).get('/api/v1/audit/logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(logsRes.status, 200);
    assert.ok(logsRes.body.data.logs.length >= 5);

    // Verify sensitive scrubbing
    for (const log of logsRes.body.data.logs) {
      const logStr = JSON.stringify(log);
      assert.ok(!logStr.includes('SecurePass123!'), 'Plain password must never appear in audit trail');
    }
  });
});
