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

test('Document Access, Preview and Download Suite — Commit 068', async (t) => {
  documentRepository.clearStore();
  referralRepository.clearStore();
  patientRepository.clearStore();
  UserModel.clearMockUsers();
  securityAuditService.clearStore();

  const hashedPassword = await hashPassword('SecurePassword123!');

  // Actor 1: Health Centre Staff (Bole HC)
  const hcStaff = await UserModel.create({
    email: 'hc.doc@careconnect.et',
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

  // Actor 2: Hospital Liaison (Tikur Anbessa Hospital)
  const hospDoctorTikur = await UserModel.create({
    email: 'dr.tikur@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Girma',
    lastName: 'Hailu',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-tikur-01'
  });
  const hospTikurToken = generateAccessToken({
    userId: hospDoctorTikur.id,
    roleId: 2,
    roleName: 'HOSPITAL_STAFF',
    portal: 'HOSPITAL'
  });

  // Actor 3: Unrelated Hospital Clinician (St. Paul Hospital)
  const hospDoctorStPaul = await UserModel.create({
    email: 'dr.stpaul@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Dr. Martha',
    lastName: 'Tadesse',
    roleId: 2, // HOSPITAL_STAFF
    facilityId: 'fac-hosp-stpaul-02'
  });
  const hospStPaulToken = generateAccessToken({
    userId: hospDoctorStPaul.id,
    roleId: 2,
    roleName: 'HOSPITAL_STAFF',
    portal: 'HOSPITAL'
  });

  // Actor 4: Transport Coordinator (Must be blocked from clinical records)
  const transportCoord = await UserModel.create({
    email: 'trans.coord@careconnect.et',
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
  const admin = await UserModel.create({
    email: 'admin.docs@careconnect.et',
    passwordHash: hashedPassword,
    firstName: 'Yohannes',
    lastName: 'Kassa',
    roleId: 6, // SYSTEM_ADMINISTRATOR
    facilityId: null
  });
  const adminToken = generateAccessToken({
    userId: admin.id,
    roleId: 6,
    roleName: 'SYSTEM_ADMINISTRATOR',
    portal: 'ADMINISTRATOR'
  });

  // Setup: Patient registered at Bole Health Centre
  const patient = await patientRepository.create({
    id: 'ETH-PAT-2026-DOC01',
    first_name: 'Solomon',
    father_name: 'Tekle',
    registered_facility_id: 'fac-hc-bole-01'
  });

  // Setup: Referral from Bole HC to Tikur Anbessa Hospital
  const referral = await referralRepository.create({
    id: 'ETH-REF-2026-ATTACH01',
    patient_id: patient.id,
    origin_facility_id: 'fac-hc-bole-01',
    destination_facility_id: 'fac-hosp-tikur-01',
    status: 'SUBMITTED'
  });

  // Setup: Save a sample medical attachment into private storage
  const samplePdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
  const storageKey = 'docs/2026/11/sample-referral-slip.pdf';
  await defaultStorageProvider.saveFile(storageKey, samplePdfBytes);

  const document = await documentRepository.create({
    referral_id: referral.id,
    patient_id: patient.id,
    facility_id: 'fac-hc-bole-01',
    document_category: 'REFERRAL_LETTER',
    file_name: 'Official_Referral_Letter.pdf',
    file_path: storageKey,
    storage_uri: `private://${storageKey}`,
    mime_type: 'application/pdf',
    file_size_bytes: samplePdfBytes.length,
    sha256_checksum: 'dummychecksum12345',
    uploaded_by_user_id: hcStaff.id
  });

  await t.test('1. Health Centre Staff (originating facility) can view document metadata', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, document.id);
    assert.equal(res.body.data.file_name, 'Official_Referral_Letter.pdf');
    // Ensure absolute file_path is stripped
    assert.equal(res.body.data.file_path, undefined);
  });

  await t.test('2. Receiving Hospital Staff can view document metadata', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}`, {
      headers: { Authorization: `Bearer ${hospTikurToken}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, document.id);
  });

  await t.test('3. Cross-facility Hospital Staff (St. Paul) is forbidden from viewing metadata (403)', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}`, {
      headers: { Authorization: `Bearer ${hospStPaulToken}` }
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /only access documents for referrals assigned to their hospital/);
  });

  await t.test('4. Transport Coordinator is strictly forbidden from clinical document metadata (403)', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}`, {
      headers: { Authorization: `Bearer ${transportToken}` }
    });

    assert.equal(res.statusCode, 403);
    assert.match(res.body.error.message, /Transport coordinators and drivers are not authorized/);
  });

  await t.test('5. Receiving Hospital Clinician can download document with secure headers', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}/download`, {
      headers: { Authorization: `Bearer ${hospTikurToken}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.match(res.headers['content-disposition'], /attachment; filename="Official_Referral_Letter\.pdf"/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['cache-control'], 'no-store, no-cache, must-revalidate, private');
    assert.equal(res.headers['pragma'], 'no-cache');
  });

  await t.test('6. Receiving Hospital Clinician can preview document inline with secure headers', async () => {
    const res = await request(app).get(`/api/v1/documents/${document.id}/preview`, {
      headers: { Authorization: `Bearer ${hospTikurToken}` }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.match(res.headers['content-disposition'], /inline; filename="Official_Referral_Letter\.pdf"/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['cache-control'], 'no-store, no-cache, must-revalidate, private');
  });

  await t.test('7. System Administrator is forbidden from direct clinical download/preview (403)', async () => {
    const resDownload = await request(app).get(`/api/v1/documents/${document.id}/download`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resDownload.statusCode, 403);
    assert.match(resDownload.body.error.message, /Administrators are restricted from direct access/);

    const resPreview = await request(app).get(`/api/v1/documents/${document.id}/preview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(resPreview.statusCode, 403);
  });

  await t.test('8. Lists documents by referral ID with tenancy restrictions', async () => {
    // Authorized hospital doctor
    const res = await request(app).get(`/api/v1/referrals/${referral.id}/documents`, {
      headers: { Authorization: `Bearer ${hospTikurToken}` }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].id, document.id);

    // Unauthorized hospital doctor (St. Paul)
    const unauthRes = await request(app).get(`/api/v1/referrals/${referral.id}/documents`, {
      headers: { Authorization: `Bearer ${hospStPaulToken}` }
    });
    assert.equal(unauthRes.statusCode, 403);
  });

  await t.test('9. Lists documents by patient ID with tenancy restrictions', async () => {
    // Authorized Health Centre staff
    const res = await request(app).get(`/api/v1/patients/${patient.id}/documents`, {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);

    // Transport coordinator forbidden
    const transRes = await request(app).get(`/api/v1/patients/${patient.id}/documents`, {
      headers: { Authorization: `Bearer ${transportToken}` }
    });
    assert.equal(transRes.statusCode, 403);
  });

  await t.test('10. Non-existent document ID returns 404 Not Found safely', async () => {
    const res = await request(app).get('/api/v1/documents/999999', {
      headers: { Authorization: `Bearer ${hcToken}` }
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
  });
});
