import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import FacilityRepository from '../src/repositories/facilityRepository.js';
import AssignmentRepository from '../src/repositories/assignmentRepository.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Facility Staff & Role Assignment Suite — Commit 036', async (t) => {
  UserModel.clearMockUsers();
  FacilityRepository.clearStore();
  AssignmentRepository.clearStore();

  const hashedPassword = await hashPassword('AdminPass123!');

  // Seed Admin user
  const adminUser = await UserModel.create({
    email: 'admin.assignment@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Admin',
    lastName: 'Officer',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });

  // Seed Staff user
  const staffUser = await UserModel.create({
    email: 'nurse.assignment@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tsedey',
    lastName: 'Girma',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: null
  });

  // Seed Facilities
  await FacilityRepository.create({
    id: 'fac-hc-bishoftu-01',
    name: 'Bishoftu Health Centre',
    facilityType: 'HEALTH_CENTRE',
    region: 'Oromia'
  });

  await FacilityRepository.create({
    id: 'fac-hosp-bishoftu-02',
    name: 'Bishoftu General Hospital',
    facilityType: 'GENERAL_HOSPITAL',
    region: 'Oromia'
  });

  const adminToken = generateAccessToken(adminUser);
  const staffToken = generateAccessToken(staffUser);

  await t.test('POST /api/v1/users/:userId/facilities assigns user to facility', async () => {
    const res = await request(app).post(`/api/v1/users/${staffUser.id}/facilities`, {
      facilityId: 'fac-hc-bishoftu-01',
      assignmentRole: 'Triage Nurse',
      isPrimary: true
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.assignment);
    assert.equal(res.body.data.assignment.facility_id, 'fac-hc-bishoftu-01');
    assert.equal(res.body.data.assignment.assignment_role, 'Triage Nurse');
  });

  await t.test('POST /api/v1/users/:userId/facilities rejects duplicate active assignment with 409 CONFLICT', async () => {
    const res = await request(app).post(`/api/v1/users/${staffUser.id}/facilities`, {
      facilityId: 'fac-hc-bishoftu-01',
      assignmentRole: 'Senior Nurse'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'CONFLICT');
    assert.ok(res.body.error.message.includes('already actively assigned'));
  });

  await t.test('GET /api/v1/users/:userId/facilities lists user assigned facilities', async () => {
    const res = await request(app).get(`/api/v1/users/${staffUser.id}/facilities`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.facilities));
    assert.equal(res.body.data.facilities.length, 1);
    assert.equal(res.body.data.facilities[0].facility_id, 'fac-hc-bishoftu-01');
  });

  await t.test('GET /api/v1/facilities/:facilityId/staff lists assigned staff for facility', async () => {
    const res = await request(app).get('/api/v1/facilities/fac-hc-bishoftu-01/staff', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.staff));
    assert.equal(res.body.data.staff.length, 1);
    assert.equal(res.body.data.staff[0].user_id, staffUser.id);
  });

  await t.test('DELETE /api/v1/users/:userId/facilities/:facilityId ends the assignment', async () => {
    const res = await request(app).delete(`/api/v1/users/${staffUser.id}/facilities/fac-hc-bishoftu-01`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify user has 0 active assignments now
    const checkRes = await request(app).get(`/api/v1/users/${staffUser.id}/facilities`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(checkRes.body.data.facilities.length, 0);
  });

  await t.test('POST /api/v1/users/:userId/roles assigns role to user', async () => {
    const res = await request(app).post(`/api/v1/users/${staffUser.id}/roles`, {
      roleId: 2 // HOSPITAL_STAFF
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.roleAssignment);
  });

  await t.test('POST /api/v1/users/:userId/roles prevents self-escalation', async () => {
    const res = await request(app).post(`/api/v1/users/${staffUser.id}/roles`, {
      roleId: 6 // elevate self to admin
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('DELETE /api/v1/users/:userId/roles/:roleId revokes role', async () => {
    const res = await request(app).delete(`/api/v1/users/${staffUser.id}/roles/2`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  await t.test('GET /api/v1/roles returns platform roles directory', async () => {
    const res = await request(app).get('/api/v1/roles', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.roles));
    assert.ok(res.body.data.roles.length >= 7);
  });

  await t.test('GET /api/v1/roles/:roleId/permissions returns attached permissions', async () => {
    const res = await request(app).get('/api/v1/roles/1/permissions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.permissions));
    assert.ok(res.body.data.permissions.some((p) => p.code === 'referral:create'));
  });
});
