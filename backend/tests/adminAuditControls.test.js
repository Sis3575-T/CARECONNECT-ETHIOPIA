import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import UserModel from '../src/models/userModel.js';
import FacilityRepository from '../src/repositories/facilityRepository.js';
import AssignmentRepository from '../src/repositories/assignmentRepository.js';
import SecurityAuditService from '../src/services/securityAuditService.js';
import SessionService from '../src/services/sessionService.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';

test('Administrative Audit & Security Account Controls Suite — Commit 039', async (t) => {
  UserModel.clearMockUsers();
  FacilityRepository.clearStore();
  AssignmentRepository.clearStore();
  SecurityAuditService.clearStore();

  const hashedPassword = await hashPassword('AdminPass123!');

  // Seed Admin user (Role 6)
  const adminUser = await UserModel.create({
    email: 'compliance.admin@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Auditor',
    lastName: 'General',
    roleId: 6,
    facilityId: null
  });

  // Seed Staff user (Role 1)
  const staffUser = await UserModel.create({
    email: 'clinical.staff@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Kenenisa',
    lastName: 'Bekele',
    roleId: 1,
    facilityId: 'fac-audit-hc-01'
  });

  await FacilityRepository.create({
    id: 'fac-audit-hc-01',
    name: 'Bekoji Health Centre',
    facilityType: 'HEALTH_CENTRE',
    region: 'Oromia'
  });

  const adminToken = generateAccessToken(adminUser);
  const staffToken = generateAccessToken(staffUser);

  let targetUserId = null;

  await t.test('1. User creation emits sanitized USER_ACCOUNT_CREATED audit event', async () => {
    const res = await request(app).post('/api/v1/users', {
      email: 'nurse.audited@careconnect.et',
      firstName: 'Genzebe',
      lastName: 'Dibaba',
      roleId: 1,
      facilityId: 'fac-audit-hc-01'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    targetUserId = res.body.data.user.id;

    const logs = await SecurityAuditService.queryLogs({ eventName: 'USER_ACCOUNT_CREATED' });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].user_id, adminUser.id);
  });

  await t.test('2. User profile update emits USER_ACCOUNT_UPDATED audit event', async () => {
    const res = await request(app).patch(`/api/v1/users/${targetUserId}`, {
      jobTitle: 'Head Clinical Nurse'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    const logs = await SecurityAuditService.queryLogs({ eventName: 'USER_ACCOUNT_UPDATED' });
    assert.ok(logs.length >= 1);
  });

  await t.test('3. Account deactivation emits USER_ACCOUNT_DEACTIVATED and revokes active sessions', async () => {
    // Establish active session
    await SessionService.createSession(targetUserId, {
      headers: { 'user-agent': 'Audit-Controlled-Session' }
    });

    const activeBefore = await SessionService.listSessions(targetUserId);
    assert.ok(activeBefore.length > 0);

    const res = await request(app).patch(`/api/v1/users/${targetUserId}/status`, {
      isActive: false
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);

    // Verify session termination
    const activeAfter = await SessionService.listSessions(targetUserId);
    assert.equal(activeAfter.length, 0);

    const logs = await SecurityAuditService.queryLogs({ eventName: 'USER_ACCOUNT_DEACTIVATED' });
    assert.ok(logs.length >= 1);
  });

  await t.test('4. Facility registration emits FACILITY_CREATED audit event', async () => {
    const res = await request(app).post('/api/v1/facilities', {
      id: 'fac-audit-hosp-02',
      name: 'Asella Teaching Hospital',
      facilityType: 'TERTIARY_HOSPITAL',
      region: 'Oromia'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    const logs = await SecurityAuditService.queryLogs({ eventName: 'FACILITY_CREATED' });
    assert.ok(logs.length >= 1);
  });

  await t.test('5. Facility staff assignment emits FACILITY_STAFF_ASSIGNED audit event', async () => {
    const res = await request(app).post(`/api/v1/users/${staffUser.id}/facilities`, {
      facilityId: 'fac-audit-hc-01',
      assignmentRole: 'Chief Clinical Officer'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 201);
    const logs = await SecurityAuditService.queryLogs({ eventName: 'FACILITY_STAFF_ASSIGNED' });
    assert.ok(logs.length >= 1);
  });

  await t.test('6. GET /api/v1/audit/logs allows administrator to inspect audit trail', async () => {
    const res = await request(app).get('/api/v1/audit/logs', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.logs));
    assert.ok(res.body.data.logs.length >= 5);
  });

  await t.test('7. GET /api/v1/audit/logs rejects regular staff with 403 FORBIDDEN', async () => {
    const res = await request(app).get('/api/v1/audit/logs', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('8. Audit log sanitizer strips passwords, hashes, and tokens completely', () => {
    const sensitive = {
      password: 'PlainPassword123',
      passwordHash: '$2a$10$abcdef',
      token: 'jwt-raw-string',
      refreshTokenHash: 'sha256hash123',
      safeField: 'Legitimate metadata'
    };

    const sanitized = SecurityAuditService.sanitizeDetails(sensitive);
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.passwordHash, '[REDACTED]');
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.refreshTokenHash, '[REDACTED]');
    assert.equal(sanitized.safeField, 'Legitimate metadata');
  });
});
