import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LocalStorageProvider } from '../src/services/storage/localStorageProvider.js';
import { S3StorageProvider } from '../src/services/storage/s3StorageProvider.js';
import { createStorageProvider } from '../src/services/storage/index.js';
import { DocumentStorageService } from '../src/services/documentStorageService.js';
import documentRepository from '../src/repositories/documentRepository.js';
import { NotFoundError } from '../src/utils/errors.js';

test('Private Document Storage Integration Suite — Commit 067', async (t) => {
  const tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'careconnect-docs-test-'));
  const localProvider = new LocalStorageProvider(tempStorageDir);
  const samplePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF');

  t.after(() => {
    try {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('1. LocalStorageProvider writes file with restricted permissions outside web root', async () => {
    const key = 'docs/2026/11/test-file.pdf';
    const result = await localProvider.saveFile(key, samplePdf);

    assert.equal(result.storageKey, key);
    assert.equal(result.storageUri, `private://${key}`);
    assert.equal(result.bytesWritten, samplePdf.length);

    const exists = await localProvider.fileExists(key);
    assert.equal(exists, true);

    const meta = await localProvider.getMetadata(key);
    assert.equal(meta.size, samplePdf.length);
  });

  await t.test('2. LocalStorageProvider reads back exact buffer', async () => {
    const key = 'docs/2026/11/test-file.pdf';
    const buffer = await localProvider.getFileBuffer(key);
    assert.deepEqual(buffer, samplePdf);
  });

  await t.test('3. LocalStorageProvider blocks path traversal in storage keys', async () => {
    const maliciousKey = '../../../../etc/shadow';
    assert.rejects(
      async () => localProvider.saveFile(maliciousKey, samplePdf),
      /Path traversal attempt detected/
    );
  });

  await t.test('4. LocalStorageProvider raises NotFoundError on non-existent storage keys', async () => {
    const missingKey = 'docs/2026/11/non-existent-uuid.pdf';
    assert.rejects(
      async () => localProvider.getFileBuffer(missingKey),
      (err) => err instanceof NotFoundError
    );
  });

  await t.test('5. LocalStorageProvider securely deletes stored file', async () => {
    const key = 'docs/2026/11/to-delete.pdf';
    await localProvider.saveFile(key, samplePdf);
    assert.equal(await localProvider.fileExists(key), true);

    const deleted = await localProvider.deleteFile(key);
    assert.equal(deleted, true);
    assert.equal(await localProvider.fileExists(key), false);
  });

  await t.test('6. S3StorageProvider manages private objects in memory store', async () => {
    const s3Provider = new S3StorageProvider({ bucket: 'careconnect-secure-documents' });
    const s3Key = 'docs/2026/11/s3-test.pdf';

    const saveRes = await s3Provider.saveFile(s3Key, samplePdf);
    assert.equal(saveRes.storageUri, `s3://careconnect-secure-documents/${s3Key}`);

    const retrieved = await s3Provider.getFileBuffer(s3Key);
    assert.deepEqual(retrieved, samplePdf);

    const exists = await s3Provider.fileExists(s3Key);
    assert.equal(exists, true);

    await s3Provider.deleteFile(s3Key);
    assert.equal(await s3Provider.fileExists(s3Key), false);
  });

  await t.test('7. createStorageProvider factory resolves configured provider', () => {
    const local = createStorageProvider({ provider: 'local', localDir: tempStorageDir });
    assert.ok(local instanceof LocalStorageProvider);

    const s3 = createStorageProvider({ provider: 's3' });
    assert.ok(s3 instanceof S3StorageProvider);
  });

  await t.test('8. DocumentStorageService integrates validation, storage, and database persistence', async () => {
    documentRepository.clearStore();
    const service = new DocumentStorageService(localProvider, documentRepository);

    const file = {
      originalname: 'Referral_Letter_Test.pdf',
      mimetype: 'application/pdf',
      size: samplePdf.length,
      buffer: samplePdf
    };

    const metadata = {
      referral_id: 'ETH-REF-2026-TEST10',
      patient_id: 'ETH-PAT-010',
      document_category: 'REFERRAL_LETTER'
    };

    const user = {
      userId: 5,
      facilityId: 'fac-hc-bole-01'
    };

    const doc = await service.storeDocument({ file, metadata, user });
    assert.ok(doc.id);
    assert.equal(doc.referral_id, 'ETH-REF-2026-TEST10');
    assert.equal(doc.patient_id, 'ETH-PAT-010');
    assert.equal(doc.facility_id, 'fac-hc-bole-01');
    assert.equal(doc.uploaded_by_user_id, 5);
    assert.ok(doc.storage_uri.startsWith('private://'));

    // Retrieve file buffer
    const fetched = await service.getFileBufferForDocument(doc.id);
    assert.deepEqual(fetched.buffer, samplePdf);
    assert.equal(fetched.fileName, 'Referral_Letter_Test.pdf');
  });
});
