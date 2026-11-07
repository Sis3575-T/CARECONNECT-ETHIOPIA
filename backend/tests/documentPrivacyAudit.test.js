import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import documentRepository from '../src/repositories/documentRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import defaultStorageProvider from '../src/services/storage/index.js';
import UserModel from '../src/models/userModel.js';
import securityAuditService from '../src/services/securityAuditService.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';
import { SECURITY_EVENTS } from '../src/constants/index.js';

test('Document Privacy and Access Auditing Suite — Commit 070', async (t) => {
  documentRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Health Centre Staff (Bole HC)
  const hcStaff = await UserModel.create({
    email: 'hc.audit@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Tsedey',
    lastName: 'Bekele',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });
  const hcToken = generateAccessToken({
    userId: hcStaff.id,
    roleId: 1,
    roleName: 'HEALTH_CENTRE_STAFF',
    portal: 'HEALTH_CENTRE'
  });

  // Receiving Hospital Doctor (Tikur Anbessa Hospital)
  const hospDoctor = await UserModel.create({
    email: 'hosp.audit@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Girma',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });
  const hospToken = generateAccessToken({
    userId: hospDoctor.id,
    roleId: 2,
    roleName: 'HOSPITAL_STAFF',
    portal: 'HOSPITAL'
  });

  // Unrelated Hospital Doctor (St. Paul Hospital)
  const unrelatedDoctor = await UserModel.create({
    email: 'unrelated.audit@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Bethlehem',
    lastName: 'Kebede',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-stpaul-02'
  });
  const unrelatedToken = generateAccessToken({
    userId: unrelatedDoctor.id,
    roleId: 2,
    roleName: 'HOSPITAL_STAFF',
    portal: 'HOSPITAL'
  });

  // Setup: Referral and Document
  const referral = await referralRepository.create({
    id: 'ETH-REF-2026-AUDIT01',
    patient_id: 'ETH-PAT-070',
    origin_facility_id: 'fac-hc-bole-01',
    destination_facility_id: 'fac-hosp-tikur-01',
    status: 'SUBMITTED'
  });

  const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (AuditDoc) >>\nendobj\n%%EOF');
  const storageKey = 'docs/2026/11/audit-test.pdf';
  await defaultStorageProvider.saveFile(storageKey, pdfBytes);

  const document = await documentRepository.create({
    referral_id: referral.id,
    patient_id: 'ETH-PAT-070',
    facility_id: 'fac-hc-bole-01',
    document_category: 'REFERRAL_LETTER',
    file_name: 'audit_referral_letter.pdf',
    file_path: storageKey,
    storage_uri: `private://${storageKey}`,
    mime_type: 'application/pdf',
    file_size_bytes: pdfBytes.length,
    uploaded_by_user_id: hcStaff.id
  });

  await t.test('1. Viewing document records DOCUMENT_VIEWED and document_access_logs entry', async () => {
    securityAuditService.clearStore();

    const res = await request(app).get(`/api/v1/documents/${document.id}`, {
      headers: {
        Authorization: `Bearer ${hcToken}`,
        'x-request-id': 'req-audit-test-01'
      }
    });

    assert.equal(res.status, 200);

    // Verify document access log in repository
    const accessLogs = await documentRepository.getAccessLogs(document.id);
    assert.ok(accessLogs.length >= 1);
    assert.equal(accessLogs[0].access_type, 'VIEW');
    assert.equal(accessLogs[0].accessed_by_user_id, hcStaff.id);

    // Verify security audit log
    const auditEvents = securityAuditService.getInMemoryLogs();
    const viewEvent = auditEvents.find(e => e.event_name === SECURITY_EVENTS.DOCUMENT_VIEWED);
    assert.ok(viewEvent, 'DOCUMENT_VIEWED audit event must be created');
    assert.equal(viewEvent.user_id, hcStaff.id);
    assert.equal(viewEvent.details.documentId, document.id);
  });

  await t.test('2. Downloading document records DOCUMENT_DOWNLOADED audit event', async () => {
    securityAuditService.clearStore();

    const res = await request(app).get(`/api/v1/documents/${document.id}/download`, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);

    const auditEvents = securityAuditService.getInMemoryLogs();
    const downloadEvent = auditEvents.find(e => e.event_name === SECURITY_EVENTS.DOCUMENT_DOWNLOADED);
    assert.ok(downloadEvent, 'DOCUMENT_DOWNLOADED event logged');
    assert.equal(downloadEvent.user_id, hospDoctor.id);
  });

  await t.test('3. Previewing document records DOCUMENT_PREVIEWED audit event', async () => {
    securityAuditService.clearStore();

    const res = await request(app).get(`/api/v1/documents/${document.id}/preview`, {
      headers: { Authorization: `Bearer ${hospToken}` }
    });

    assert.equal(res.status, 200);

    const auditEvents = securityAuditService.getInMemoryLogs();
    const previewEvent = auditEvents.find(e => e.event_name === SECURITY_EVENTS.DOCUMENT_PREVIEWED);
    assert.ok(previewEvent, 'DOCUMENT_PREVIEWED event logged');
    assert.equal(previewEvent.user_id, hospDoctor.id);
  });

  await t.test('4. Document verification records verification outcome in audit log', async () => {
    securityAuditService.clearStore();

    const res = await request(app).post(
      `/api/v1/documents/${document.id}/verify`,
      {
        status: 'VERIFIED',
        verification_notes: 'Verified against national referral policy'
      },
      {
        headers: { Authorization: `Bearer ${hospToken}` }
      }
    );

    assert.equal(res.status, 200);

    const auditEvents = securityAuditService.getInMemoryLogs();
    const verifyEvent = auditEvents.find(e => e.event_name === SECURITY_EVENTS.DOCUMENT_VERIFIED);
    assert.ok(verifyEvent, 'DOCUMENT_VERIFIED event recorded');
    assert.equal(verifyEvent.user_id, hospDoctor.id);
  });

  await t.test('5. Audit details sanitization automatically redacts sensitive tokens and buffers', () => {
    const rawDetails = {
      documentId: 101,
      fileName: 'report.pdf',
      user_password: 'ShouldBeRedacted!',
      auth_token: 'jwt.token.here',
      extracted_text: 'Confidential clinical diagnosis information',
      buffer: Buffer.from('binary-data'),
      nested: {
        api_secret: 'secret-key-123'
      }
    };

    const sanitized = securityAuditService.sanitizeDetails(rawDetails);
    assert.equal(sanitized.documentId, 101);
    assert.equal(sanitized.fileName, 'report.pdf');
    assert.equal(sanitized.user_password, '[REDACTED]');
    assert.equal(sanitized.auth_token, '[REDACTED]');
    assert.equal(sanitized.extracted_text, '[REDACTED]');
    assert.equal(sanitized.buffer, '[REDACTED]');
    assert.equal(sanitized.nested.api_secret, '[REDACTED]');
  });

  await t.test('6. Authorized staff can query document access log history', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}/logs`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });

  await t.test('7. Cross-facility staff cannot query document access log history (403)', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}/logs`, {
      headers: { Authorization: `Bearer ${unrelatedToken}` }
    });

    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /Not authorized to view access logs/);
  });
});
