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
import { DOCUMENT_PROCESSING_STATUS } from '../src/constants/index.js';

test('Document Lifecycle and AI Processing Preparation Suite — Commit 071', async (t) => {
  documentRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Health Centre Staff (Bole HC)
  const hcStaff = await UserModel.create({
    email: 'hc.lifecycle@careconnect.et',
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

  // Receiving Hospital Doctor
  const hospDoctor = await UserModel.create({
    email: 'hosp.lifecycle@careconnect.et',
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

  // Transport Coordinator
  const transportUser = await UserModel.create({
    email: 'trans.lifecycle@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Abebe',
    lastName: 'Mekonnen',
    roleId: 4, // TRANSPORT_COORDINATOR
    facilityId: 'fac-transport-central'
  });
  const transportToken = generateAccessToken({
    userId: transportUser.id,
    roleId: 4,
    roleName: 'TRANSPORT_COORDINATOR',
    portal: 'TRANSPORT'
  });

  // Setup: Referral & Document
  const referral = await referralRepository.create({
    id: 'ETH-REF-2026-LIFE01',
    patient_id: 'ETH-PAT-099',
    origin_facility_id: 'fac-hc-bole-01',
    destination_facility_id: 'fac-hosp-tikur-01',
    status: 'SUBMITTED'
  });

  const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (LifecycleDoc) >>\nendobj\n%%EOF');
  const storageKey = 'docs/2026/11/lifecycle-test.pdf';
  await defaultStorageProvider.saveFile(storageKey, pdfBytes);

  const document = await documentRepository.create({
    referral_id: referral.id,
    patient_id: 'ETH-PAT-099',
    facility_id: 'fac-hc-bole-01',
    document_category: 'LAB_RESULT',
    file_name: 'cbc_report.pdf',
    file_path: storageKey,
    storage_uri: `private://${storageKey}`,
    mime_type: 'application/pdf',
    file_size_bytes: pdfBytes.length,
    uploaded_by_user_id: hcStaff.id
  });

  await t.test('1. Document archival transitions verification_status to ARCHIVED and records timestamp', async () => {
    const res = await request(app).post(
      `/api/v1/documents/${document.id}/archive`,
      { reason: 'Case closed and past active operational period' },
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verification_status, 'ARCHIVED');
    assert.ok(res.body.data.archived_at);
    assert.equal(res.body.data.archived_by_user_id, hcStaff.id);
  });

  await t.test('2. Soft deletion requires mandatory deletion reason', async () => {
    const res = await request(app).delete(`/api/v1/documents/${document.id}`, {
      headers: { Authorization: `Bearer ${hcToken}` }
      // Missing deletion reason
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /deletion reason is required/);
  });

  await t.test('3. Unauthorized staff cannot soft-delete documents (403)', async () => {
    const res = await request(app).delete(`/api/v1/documents/${document.id}?reason=Accidental+scan`, {
      headers: { Authorization: `Bearer ${transportToken}` }
    });

    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /do not have permission to delete/);
  });

  await t.test('4. Authorized staff can soft-delete document with audit trail', async () => {
    const res = await request(app).delete(`/api/v1/documents/${document.id}`, {
      body: { reason: 'Duplicate specimen barcode uploaded by mistake' },
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.deleted_at);
    assert.equal(res.body.data.deletion_reason, 'Duplicate specimen barcode uploaded by mistake');

    // Subsequent retrieval must return 404 Not Found
    const fetchRes = await request(app).get(`/api/v1/documents/${document.id}`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(fetchRes.status, 404);
  });

  await t.test('5. AI/OCR preparation: queries initial processing status with clinical disclaimer', async () => {
    // Create fresh active document for AI prep testing
    const doc2 = await documentRepository.create({
      referral_id: referral.id,
      patient_id: 'ETH-PAT-099',
      facility_id: 'fac-hc-bole-01',
      document_category: 'REFERRAL_LETTER',
      file_name: 'clinical_referral.pdf',
      file_path: storageKey,
      storage_uri: `private://${storageKey}`,
      mime_type: 'application/pdf',
      file_size_bytes: pdfBytes.length,
      uploaded_by_user_id: hcStaff.id
    });

    const res = await request(app).get(`/api/v1/documents/${doc2.id}/processing`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.processingStatus, DOCUMENT_PROCESSING_STATUS.PENDING);
    assert.equal(res.body.data.processingAttempts, 0);
    assert.match(res.body.data.disclaimer, /Clinical decision making remains strictly human-led/);
  });

  await t.test('6. AI/OCR preparation: queues processing job and increments attempt counter', async () => {
    const doc = await documentRepository.create({
      referral_id: referral.id,
      patient_id: 'ETH-PAT-099',
      facility_id: 'fac-hc-bole-01',
      file_name: 'to_process.pdf',
      file_path: storageKey,
      mime_type: 'application/pdf',
      file_size_bytes: 1000
    });

    const queueRes = await request(app).post(
      `/api/v1/documents/${doc.id}/processing/queue`,
      { targetDpi: 300 },
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );

    assert.equal(queueRes.status, 200);
    assert.equal(queueRes.body.data.status, 'QUEUED');
    assert.equal(queueRes.body.data.document.processing_status, 'PROCESSING');
    assert.equal(queueRes.body.data.document.processing_attempts, 1);

    // Duplicate Job Prevention / Idempotency check:
    const dupRes = await request(app).post(
      `/api/v1/documents/${doc.id}/processing/queue`,
      {},
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );

    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.data.status, 'ALREADY_ACTIVE');
    assert.match(dupRes.body.data.message, /already actively in progress/);
  });

  await t.test('7. AI/OCR preparation: records processing result with error handling', async () => {
    const doc = await documentRepository.create({
      referral_id: referral.id,
      patient_id: 'ETH-PAT-099',
      facility_id: 'fac-hc-bole-01',
      file_name: 'processing_err.pdf',
      file_path: storageKey,
      mime_type: 'application/pdf',
      file_size_bytes: 1000
    });

    const completeRes = await request(app).post(
      `/api/v1/documents/${doc.id}/processing/complete`,
      {
        status: DOCUMENT_PROCESSING_STATUS.FAILED,
        error: 'OCR model low confidence threshold: document is handwritten in faded ink',
        metadata: {
          confidenceScore: 0.32,
          modelAttempted: 'careconnect-amharic-ocr-v0.9'
        }
      },
      { headers: { Authorization: `Bearer ${hcToken}` } }
    );

    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.data.processing_status, 'FAILED');
    assert.match(completeRes.body.data.processing_error, /low confidence threshold/);
  });
});
