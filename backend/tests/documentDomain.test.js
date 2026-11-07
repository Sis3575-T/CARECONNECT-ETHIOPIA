import test from 'node:test';
import assert from 'node:assert/strict';
import documentRepository from '../src/repositories/documentRepository.js';
import { DOCUMENT_CATEGORIES, DOCUMENT_VERIFICATION_STATUS, DOCUMENT_PROCESSING_STATUS } from '../src/constants/index.js';

test('Document Management Domain Repository Suite — Commit 065', async (t) => {
  documentRepository.clearStore();

  await t.test('1. Creates document with complete medical metadata and default versioning', async () => {
    const doc = await documentRepository.create({
      referral_id: 'ETH-REF-2026-TEST01',
      patient_id: 'ETH-PAT-001',
      facility_id: 'fac-hc-bole-01',
      document_category: DOCUMENT_CATEGORIES.REFERRAL_LETTER,
      file_name: 'referral_letter.pdf',
      file_path: 'documents/2026/uuid-test-01.pdf',
      storage_uri: 'private://documents/2026/uuid-test-01.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1048576,
      sha256_checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploaded_by_user_id: 10
    });

    assert.ok(doc.id, 'Document has primary ID');
    assert.ok(doc.uuid, 'Document has UUID');
    assert.equal(doc.version_number, 1);
    assert.equal(doc.is_latest, true);
    assert.equal(doc.verification_status, DOCUMENT_VERIFICATION_STATUS.UPLOADED);
    assert.equal(doc.processing_status, DOCUMENT_PROCESSING_STATUS.PENDING);
    assert.equal(doc.document_category, DOCUMENT_CATEGORIES.REFERRAL_LETTER);
    assert.equal(doc.file_name, 'referral_letter.pdf');
  });

  await t.test('2. Retrieves document by ID and UUID', async () => {
    const created = await documentRepository.create({
      referral_id: 'ETH-REF-2026-TEST02',
      patient_id: 'ETH-PAT-002',
      facility_id: 'fac-hc-bole-01',
      document_category: DOCUMENT_CATEGORIES.LAB_RESULT,
      file_name: 'lab_cbc.pdf',
      file_path: 'documents/2026/uuid-test-02.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 524288
    });

    const byId = await documentRepository.findById(created.id);
    assert.ok(byId);
    assert.equal(byId.file_name, 'lab_cbc.pdf');

    const byUuid = await documentRepository.findByUuid(created.uuid);
    assert.ok(byUuid);
    assert.equal(byUuid.id, created.id);
  });

  await t.test('3. Manages document versioning and replacement history', async () => {
    const v1 = await documentRepository.create({
      referral_id: 'ETH-REF-2026-TEST03',
      patient_id: 'ETH-PAT-003',
      facility_id: 'fac-hc-bole-01',
      document_category: DOCUMENT_CATEGORIES.IMAGING_REPORT,
      file_name: 'xray_chest_v1.png',
      file_path: 'documents/2026/xray_v1.png',
      mime_type: 'image/png',
      file_size_bytes: 2048000
    });

    const v2 = await documentRepository.replaceVersion(v1, {
      file_name: 'xray_chest_v2_corrected.png',
      file_path: 'documents/2026/xray_v2.png',
      mime_type: 'image/png',
      file_size_bytes: 2048500,
      replacement_reason: 'Higher resolution re-scan uploaded'
    });

    assert.equal(v2.version_number, 2);
    assert.equal(v2.is_latest, true);
    assert.equal(v2.document_group_id, v1.document_group_id);
    assert.equal(v2.parent_document_id, v1.id);
    assert.equal(v2.replacement_reason, 'Higher resolution re-scan uploaded');

    const updatedV1 = await documentRepository.findById(v1.id);
    assert.equal(updatedV1.is_latest, false);

    const history = await documentRepository.getVersionHistory(v1.document_group_id);
    assert.equal(history.length, 2);
    assert.equal(history[0].version_number, 1);
    assert.equal(history[1].version_number, 2);
  });

  await t.test('4. Records and queries access audit trail', async () => {
    const doc = await documentRepository.create({
      referral_id: 'ETH-REF-2026-TEST04',
      patient_id: 'ETH-PAT-004',
      facility_id: 'fac-hc-bole-01',
      document_category: DOCUMENT_CATEGORIES.PRESCRIPTION,
      file_name: 'prescription.pdf',
      file_path: 'documents/2026/rx.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 120000
    });

    await documentRepository.recordAccessLog({
      document_id: doc.id,
      accessed_by_user_id: 42,
      access_type: 'VIEW',
      ip_address: '192.168.1.10',
      user_agent: 'CareConnect/Mobile'
    });

    await documentRepository.recordAccessLog({
      document_id: doc.id,
      accessed_by_user_id: 42,
      access_type: 'DOWNLOAD',
      ip_address: '192.168.1.10',
      user_agent: 'CareConnect/Mobile'
    });

    const logs = await documentRepository.getAccessLogs(doc.id);
    assert.equal(logs.length, 2);
    assert.equal(logs[0].access_type, 'DOWNLOAD');
    assert.equal(logs[1].access_type, 'VIEW');
  });

  await t.test('5. Performs soft-deletion and archival safely preserving records', async () => {
    const doc = await documentRepository.create({
      referral_id: 'ETH-REF-2026-TEST05',
      patient_id: 'ETH-PAT-005',
      facility_id: 'fac-hc-bole-01',
      file_name: 'to_archive.pdf',
      file_path: 'documents/2026/archive.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 100000
    });

    const archived = await documentRepository.archive(doc.id, 99);
    assert.equal(archived.verification_status, 'ARCHIVED');
    assert.ok(archived.archived_at);
    assert.equal(archived.archived_by_user_id, 99);

    const deleted = await documentRepository.softDelete(doc.id, 'Patient consent revoked', 99);
    assert.ok(deleted.deleted_at);
    assert.equal(deleted.deletion_reason, 'Patient consent revoked');

    const fetched = await documentRepository.findById(doc.id);
    assert.equal(fetched, null, 'Soft-deleted document is not returned by default');
  });
});
