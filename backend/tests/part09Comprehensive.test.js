import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import documentRepository from '../src/repositories/documentRepository.js';
import referralRepository from '../src/repositories/referralRepository.js';
import patientRepository from '../src/repositories/patientRepository.js';
import defaultStorageProvider from '../src/services/storage/index.js';
import documentService from '../src/services/documentService.js';
import UserModel from '../src/models/userModel.js';
import securityAuditService from '../src/services/securityAuditService.js';
import {
  validateUploadedFile,
  sanitizeFilename,
  computeSha256Checksum
} from '../src/validators/fileValidator.js';
import { generateAccessToken } from '../src/utils/token.js';
import { hashPassword } from '../src/utils/password.js';
import { request } from './testHelper.js';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_VERIFICATION_STATUS,
  DOCUMENT_PROCESSING_STATUS,
  SECURITY_EVENTS
} from '../src/constants/index.js';
import {
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError
} from '../src/utils/errors.js';

test('Part 09 Comprehensive Verification Suite — Secure Document Management & Medical Attachments', async (t) => {
  documentRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Actor 1: Health Centre Staff (Bole HC)
  const hcStaff = await UserModel.create({
    email: 'hanna.bole@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Hanna',
    lastName: 'Mulugeta',
    roleId: 1, // HEALTH_CENTRE_STAFF
    facilityId: 'fac-hc-bole-01'
  });
  const hcToken = generateAccessToken({
    userId: hcStaff.id,
    roleId: 1,
    roleName: 'HEALTH_CENTRE_STAFF',
    portal: 'HEALTH_CENTRE'
  });

  // Actor 2: Hospital Staff (Tikur Anbessa Hospital)
  const hospDoctorTikur = await UserModel.create({
    email: 'dr.dawit@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Dawit',
    lastName: 'Girma',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });
  const hospTikurToken = generateAccessToken({
    userId: hospDoctorTikur.id,
    roleId: 2,
    roleName: 'HOSPITAL_STAFF',
    portal: 'HOSPITAL'
  });

  // Actor 3: Unrelated Hospital Doctor (St. Paul Hospital)
  const hospDoctorStPaul = await UserModel.create({
    email: 'dr.bethlehem@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Bethlehem',
    lastName: 'Kebede',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-stpaul-02'
  });
  const hospStPaulToken = generateAccessToken({
    userId: hospDoctorStPaul.id,
    roleId: 2,
    roleName: 'HOSPITAL_STAFF',
    portal: 'HOSPITAL'
  });

  // Actor 4: Transport Coordinator (Must have no clinical document access)
  const transportCoord = await UserModel.create({
    email: 'trans.lead@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Abebe',
    lastName: 'Mekonnen',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: 'fac-transport-central'
  });
  const transportToken = generateAccessToken({
    userId: transportCoord.id,
    roleId: 4,
    roleName: 'TRANSPORT_COORDINATOR',
    portal: 'TRANSPORT'
  });

  // Actor 5: System Administrator
  const adminUser = await UserModel.create({
    email: 'admin.sec@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Yohannes',
    lastName: 'Kassa',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });
  const adminToken = generateAccessToken({
    userId: adminUser.id,
    roleId: 6,
    roleName: 'SYSTEM_ADMINISTRATOR',
    portal: 'ADMINISTRATOR'
  });

  // Test Entities
  const patient = await patientRepository.create({
    id: 'ETH-PAT-2026-P09',
    first_name: 'Solomon',
    father_name: 'Tekle',
    registered_facility_id: 'fac-hc-bole-01'
  });

  const referral = await referralRepository.create({
    id: 'ETH-REF-2026-P09REF',
    patient_id: patient.id,
    origin_facility_id: 'fac-hc-bole-01',
    destination_facility_id: 'fac-hosp-tikur-01',
    status: 'SUBMITTED'
  });

  // Test Sample Buffers
  const validPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  const validJpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const validPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  let testDoc = null;

  // 1. Valid PDF upload
  await t.test('1. Valid PDF upload validation and storage persistence', async () => {
    const file = {
      originalname: 'Official_Referral_Form.pdf',
      mimetype: 'application/pdf',
      size: validPdfBytes.length,
      buffer: validPdfBytes
    };
    const validated = validateUploadedFile(file);
    assert.equal(validated.extension, 'pdf');
    assert.equal(validated.mimeType, 'application/pdf');
    assert.ok(validated.sha256Checksum);

    testDoc = await documentService.uploadDocument({
      file,
      metadata: {
        referral_id: referral.id,
        patient_id: patient.id,
        document_category: DOCUMENT_CATEGORIES.REFERRAL_LETTER
      },
      user: {
        userId: hcStaff.id,
        roleId: 1,
        roleName: 'HEALTH_CENTRE_STAFF',
        facilityId: 'fac-hc-bole-01'
      }
    });

    assert.ok(testDoc.id);
    assert.equal(testDoc.version_number, 1);
    assert.equal(testDoc.is_latest, true);
    assert.equal(testDoc.document_category, 'REFERRAL_LETTER');
  });

  // 2. Valid JPEG upload
  await t.test('2. Valid JPEG upload validation', async () => {
    const file = {
      originalname: 'wound_imaging.jpg',
      mimetype: 'image/jpeg',
      size: validJpgBytes.length,
      buffer: validJpgBytes
    };
    const validated = validateUploadedFile(file);
    assert.equal(validated.extension, 'jpg');
    assert.equal(validated.mimeType, 'image/jpeg');
  });

  // 3. Valid PNG upload
  await t.test('3. Valid PNG upload validation', async () => {
    const file = {
      originalname: 'chest_xray.png',
      mimetype: 'image/png',
      size: validPngBytes.length,
      buffer: validPngBytes
    };
    const validated = validateUploadedFile(file);
    assert.equal(validated.extension, 'png');
    assert.equal(validated.mimeType, 'image/png');
  });

  // 4. Unsupported file rejection
  await t.test('4. Rejection of unsupported file types (.docx, .txt)', () => {
    assert.throws(
      () => validateUploadedFile({
        originalname: 'notes.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 100,
        buffer: Buffer.from('dummy')
      }),
      (err) => err instanceof UnsupportedMediaTypeError
    );
  });

  // 5. File size limit enforcement
  await t.test('5. File size limit enforcement throws PayloadTooLargeError', () => {
    assert.throws(
      () => validateUploadedFile(
        {
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
          size: 1000,
          buffer: validPdfBytes
        },
        { maxSizeBytes: 20 }
      ),
      (err) => err instanceof PayloadTooLargeError && err.statusCode === 413
    );
  });

  // 6. MIME type mismatch rejection
  await t.test('6. MIME type mismatch rejection (PNG buffer declared as PDF)', () => {
    assert.throws(
      () => validateUploadedFile({
        originalname: 'fake.pdf',
        mimetype: 'application/pdf',
        size: validPngBytes.length,
        buffer: validPngBytes
      }),
      (err) => err instanceof UnsupportedMediaTypeError && err.message.includes('signature mismatch')
    );
  });

  // 7. File signature validation
  await t.test('7. File signature validation rejects corrupt file headers', () => {
    assert.throws(
      () => validateUploadedFile({
        originalname: 'corrupt.pdf',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('INVALID_HEADER_DATA')
      }),
      (err) => err instanceof UnsupportedMediaTypeError
    );
  });

  // 8. Unsafe filename handling
  await t.test('8. Unsafe filename handling eliminates path traversal sequences', () => {
    const sanitized1 = sanitizeFilename('../../etc/passwd.pdf');
    assert.equal(sanitized1, 'passwd.pdf');

    const sanitized2 = sanitizeFilename('..\\..\\windows\\system32.pdf');
    assert.equal(sanitized2, 'system32.pdf');
  });

  // 9. Unauthorized document upload
  await t.test('9. Unauthorized document upload rejection (transport coordinator)', async () => {
    await assert.rejects(
      async () => {
        await documentService.uploadDocument({
          file: {
            originalname: 'test.pdf',
            mimetype: 'application/pdf',
            size: validPdfBytes.length,
            buffer: validPdfBytes
          },
          metadata: { referral_id: referral.id },
          user: {
            userId: transportCoord.id,
            roleId: 4,
            roleName: 'TRANSPORT_COORDINATOR'
          }
        });
      },
      (err) => err instanceof ForbiddenError
    );
  });

  // 10. Unauthorized document download
  await t.test('10. Unauthorized document download rejection (system administrator restricted from direct clinical content)', async () => {
    const res = await request(app).get(`/api/v1/documents/${testDoc.id}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /Administrators are restricted from direct access/);
  });

  // 11. Cross-facility document access prevention
  await t.test('11. Cross-facility document access prevention (St. Paul clinician blocked from Bole/Tikur referral document)', async () => {
    const res = await request(app).get(`/api/v1/documents/${testDoc.id}`, {
      headers: { Authorization: `Bearer ${hospStPaulToken}` }
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /assigned to their hospital/);
  });

  // 12. Referral-based document access
  await t.test('12. Referral-based document access succeeds for receiving hospital liaison', async () => {
    const res = await request(app).get(`/api/v1/referrals/${referral.id}/documents`, {
      headers: { Authorization: `Bearer ${hospTikurToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, testDoc.id);
  });

  // 13. Patient document access restrictions
  await t.test('13. Patient document access restrictions (Health centre staff can list patient documents)', async () => {
    const res = await request(app).get(`/api/v1/patients/${patient.id}/documents`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
  });

  // 14. Document metadata persistence
  await t.test('14. Document metadata persistence retains checksum, size, and category', async () => {
    const fetched = await documentRepository.findById(testDoc.id);
    assert.ok(fetched);
    assert.equal(fetched.file_name, 'Official_Referral_Form.pdf');
    assert.equal(fetched.mime_type, 'application/pdf');
    assert.equal(fetched.file_size_bytes, validPdfBytes.length);
    assert.equal(fetched.sha256_checksum, computeSha256Checksum(validPdfBytes));
    assert.equal(fetched.version_number, 1);
  });

  // 15. Document version creation
  await t.test('15. Document version creation creates v2, updates is_latest, preserves v1', async () => {
    const v2Buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Version 2 >>\nendobj\n%%EOF');
    const createdV2 = await documentService.replaceDocumentVersion({
      documentId: testDoc.id,
      file: {
        originalname: 'Official_Referral_Form_v2.pdf',
        mimetype: 'application/pdf',
        size: v2Buffer.length,
        buffer: v2Buffer
      },
      payload: {
        replacement_reason: 'Updated referral reason and attached lab summary'
      },
      user: {
        userId: hcStaff.id,
        roleId: 1,
        roleName: 'HEALTH_CENTRE_STAFF',
        facilityId: 'fac-hc-bole-01'
      }
    });

    assert.equal(createdV2.version_number, 2);
    assert.equal(createdV2.is_latest, true);
    assert.equal(createdV2.parent_document_id, testDoc.id);
    assert.equal(createdV2.replacement_reason, 'Updated referral reason and attached lab summary');

    const oldV1 = await documentRepository.findById(testDoc.id);
    assert.equal(oldV1.is_latest, false);
  });

  // 16. Concurrent replacement protection
  await t.test('16. Concurrent replacement protection rejects attempts to overwrite superseded versions (409 Conflict)', async () => {
    await assert.rejects(
      async () => {
        await documentService.replaceDocumentVersion({
          documentId: testDoc.id, // v1 is no longer latest!
          file: {
            originalname: 'conflict.pdf',
            mimetype: 'application/pdf',
            size: validPdfBytes.length,
            buffer: validPdfBytes
          },
          payload: { replacement_reason: 'Stale concurrent update' },
          user: {
            userId: hcStaff.id,
            roleId: 1,
            roleName: 'HEALTH_CENTRE_STAFF',
            facilityId: 'fac-hc-bole-01'
          }
        });
      },
      (err) => err instanceof ConflictError && err.statusCode === 409
    );
  });

  // 17. Document verification transitions
  await t.test('17. Document verification transitions with administrative review disclaimer', async () => {
    const latestDocs = await documentRepository.findByReferralId(referral.id, { latestOnly: true });
    const targetDoc = latestDocs[0] || testDoc;

    const res = await request(app).post(
      `/api/v1/documents/${targetDoc.id}/verify`,
      {
        status: DOCUMENT_VERIFICATION_STATUS.VERIFIED,
        verification_notes: 'Attachment confirmed legible by triage nurse'
      },
      { headers: { Authorization: `Bearer ${hospTikurToken}` } }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.data.verification_status, 'VERIFIED');
    assert.equal(res.body.data.verified_by_user_id, hospDoctorTikur.id);
    assert.ok(res.body.data.verified_at);
    assert.match(res.body.data.verification_disclaimer, /Administrative review confirmation only/);
  });

  // 18. Rejection reason validation
  await t.test('18. Rejection reason validation requires minimum explanation', async () => {
    const latestDocs = await documentRepository.findByReferralId(referral.id, { latestOnly: true });
    const targetDoc = latestDocs[0] || testDoc;

    const res = await request(app).post(
      `/api/v1/documents/${targetDoc.id}/verify`,
      { status: DOCUMENT_VERIFICATION_STATUS.REJECTED },
      { headers: { Authorization: `Bearer ${hospTikurToken}` } }
    );

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(JSON.stringify(res.body).includes('rejection_reason is required'));
  });

  // 19. Document access audit creation
  await t.test('19. Document access audit creation logs actions in system_events', async () => {
    const logs = await documentRepository.getAccessLogs(testDoc.id);
    assert.ok(logs.length >= 1);

    const auditLogs = securityAuditService.getInMemoryLogs();
    assert.ok(auditLogs.some(e => e.event_name === SECURITY_EVENTS.DOCUMENT_UPLOADED));
    assert.ok(auditLogs.some(e => e.event_name === SECURITY_EVENTS.DOCUMENT_REPLACED));
    assert.ok(auditLogs.some(e => e.event_name === SECURITY_EVENTS.DOCUMENT_VERIFIED));
  });

  // 20. Unauthorized deletion prevention
  await t.test('20. Unauthorized deletion prevention (transport coordinator blocked with 403)', async () => {
    const latestDocs = await documentRepository.findByReferralId(referral.id, { latestOnly: true });
    const targetDoc = latestDocs[0] || testDoc;

    const res = await request(app).delete(`/api/v1/documents/${targetDoc.id}`, {
      body: { reason: 'Unauthorized deletion attempt' },
      headers: { Authorization: `Bearer ${transportToken}` }
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /do not have permission to delete/);
  });

  // 21. Document archival
  await t.test('21. Document archival sets status to ARCHIVED without destroying record', async () => {
    const latestDocs = await documentRepository.findByReferralId(referral.id, { latestOnly: true });
    const targetDoc = latestDocs[0] || testDoc;

    const res = await request(app).post(
      `/api/v1/documents/${targetDoc.id}/archive`,
      { reason: 'Referral lifecycle complete' },
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.data.verification_status, 'ARCHIVED');
    assert.ok(res.body.data.archived_at);
  });

  // 22. Missing storage object handling
  await t.test('22. Missing storage object handling returns 404 cleanly', async () => {
    const missingDoc = await documentRepository.create({
      referral_id: referral.id,
      patient_id: patient.id,
      facility_id: 'fac-hc-bole-01',
      file_name: 'missing.pdf',
      file_path: 'docs/non-existent/random-uuid.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 500
    });

    const res = await request(app).get(`/api/v1/documents/${missingDoc.id}/download`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(res.status, 404);
  });

  // 23. Duplicate processing job prevention
  await t.test('23. Duplicate processing job prevention enforces idempotency', async () => {
    const docForAi = await documentRepository.create({
      referral_id: referral.id,
      patient_id: patient.id,
      facility_id: 'fac-hc-bole-01',
      file_name: 'ai_doc.pdf',
      file_path: 'docs/2026/11/ai.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 2000
    });

    const queue1 = await request(app).post(
      `/api/v1/documents/${docForAi.id}/processing/queue`,
      {},
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );
    assert.equal(queue1.status, 200);
    assert.equal(queue1.body.data.status, 'QUEUED');

    const queue2 = await request(app).post(
      `/api/v1/documents/${docForAi.id}/processing/queue`,
      {},
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );
    assert.equal(queue2.status, 200);
    assert.equal(queue2.body.data.status, 'ALREADY_ACTIVE');
  });

  // 24. Sensitive data protection in logs and errors
  await t.test('24. Sensitive data protection in logs and error responses', async () => {
    // Audit sanitization redacts token, passwords, raw file content, and clinical text
    const sampleAudit = securityAuditService.sanitizeDetails({
      user_password: 'SecretPassword!',
      jwt_token: 'bearer.token.string',
      extracted_text: 'Patient diagnosed with Stage 2 pulmonary lesion',
      file_content: Buffer.from('binary-content'),
      documentId: 42
    });

    assert.equal(sampleAudit.user_password, '[REDACTED]');
    assert.equal(sampleAudit.jwt_token, '[REDACTED]');
    assert.equal(sampleAudit.extracted_text, '[REDACTED]');
    assert.equal(sampleAudit.file_content, '[REDACTED]');
    assert.equal(sampleAudit.documentId, 42);

    // Verify error responses do not leak storage paths or database credentials
    const errorRes = await request(app).get('/api/v1/documents/non-existent-id', {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(errorRes.status, 404);
    assert.ok(!JSON.stringify(errorRes.body).includes('password'));
    assert.ok(!JSON.stringify(errorRes.body).includes('postgres://'));
  });
});
