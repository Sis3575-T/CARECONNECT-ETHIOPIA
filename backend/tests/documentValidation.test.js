import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUploadedFile,
  sanitizeFilename,
  detectSignature,
  computeSha256Checksum,
  generateSafeStorageKey
} from '../src/validators/fileValidator.js';
import {
  validateDocumentMetadata,
  validateDocumentReplacement,
  validateDocumentVerification
} from '../src/validators/documentValidator.js';
import { ValidationError, PayloadTooLargeError, UnsupportedMediaTypeError } from '../src/utils/errors.js';

test('Secure Document Upload and Validation Suite — Commit 066', async (t) => {
  // Sample Valid Buffers
  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
  const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  await t.test('1. Validates authentic PDF upload with safe metadata and SHA-256', () => {
    const file = {
      originalname: 'Referral_Summary_2026.pdf',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
      buffer: validPdfBuffer
    };

    const validated = validateUploadedFile(file);
    assert.equal(validated.originalFilename, 'Referral_Summary_2026.pdf');
    assert.equal(validated.extension, 'pdf');
    assert.equal(validated.mimeType, 'application/pdf');
    assert.ok(validated.storageKey.startsWith('docs/'));
    assert.ok(validated.storageKey.endsWith('.pdf'));
    assert.equal(validated.sha256Checksum, computeSha256Checksum(validPdfBuffer));
  });

  await t.test('2. Validates authentic JPEG upload', () => {
    const file = {
      originalname: 'clinical_wound.jpg',
      mimetype: 'image/jpeg',
      size: validJpgBuffer.length,
      buffer: validJpgBuffer
    };

    const validated = validateUploadedFile(file);
    assert.equal(validated.extension, 'jpg');
    assert.equal(validated.mimeType, 'image/jpeg');
    assert.ok(validated.sha256Checksum);
  });

  await t.test('3. Validates authentic PNG upload', () => {
    const file = {
      originalname: 'xray_scan.png',
      mimetype: 'image/png',
      size: validPngBuffer.length,
      buffer: validPngBuffer
    };

    const validated = validateUploadedFile(file);
    assert.equal(validated.extension, 'png');
    assert.equal(validated.mimeType, 'image/png');
    assert.ok(validated.sha256Checksum);
  });

  await t.test('4. Rejects unsupported file extension', () => {
    const file = {
      originalname: 'medical_report.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 100,
      buffer: Buffer.from('dummy docx content')
    };

    assert.throws(() => validateUploadedFile(file), (err) => {
      assert.ok(err instanceof UnsupportedMediaTypeError);
      assert.match(err.message, /Unsupported file type/);
      return true;
    });
  });

  await t.test('5. Rejects executable and dangerous script files', () => {
    const dangerousFiles = [
      { originalname: 'malware.exe', mimetype: 'application/x-msdownload', buffer: Buffer.from('MZ...') },
      { originalname: 'script.sh', mimetype: 'application/x-sh', buffer: Buffer.from('#!/bin/bash') },
      { originalname: 'exploit.pdf.exe', mimetype: 'application/pdf', buffer: validPdfBuffer }
    ];

    for (const f of dangerousFiles) {
      assert.throws(() => validateUploadedFile(f), (err) => {
        assert.ok(err instanceof UnsupportedMediaTypeError);
        return true;
      });
    }
  });

  await t.test('6. Enforces file size limits', () => {
    const smallLimitBytes = 50;
    const file = {
      originalname: 'large.pdf',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
      buffer: validPdfBuffer
    };

    assert.throws(
      () => validateUploadedFile(file, { maxSizeBytes: smallLimitBytes }),
      (err) => {
        assert.ok(err instanceof PayloadTooLargeError);
        assert.equal(err.statusCode, 413);
        return true;
      }
    );
  });

  await t.test('7. Detects and rejects MIME type mismatch', () => {
    const file = {
      originalname: 'fake_report.pdf',
      mimetype: 'application/pdf',
      size: validPngBuffer.length,
      buffer: validPngBuffer // PNG bytes declared as PDF
    };

    assert.throws(() => validateUploadedFile(file), (err) => {
      assert.ok(err instanceof UnsupportedMediaTypeError);
      assert.match(err.message, /File signature mismatch/);
      return true;
    });
  });

  await t.test('8. Rejects corrupted or spoofed magic signatures', () => {
    const garbageBuffer = Buffer.from('NOT_A_VALID_HEADER_FOR_PDF_OR_IMAGE');
    const file = {
      originalname: 'corrupt.pdf',
      mimetype: 'application/pdf',
      size: garbageBuffer.length,
      buffer: garbageBuffer
    };

    assert.throws(() => validateUploadedFile(file), (err) => {
      assert.ok(err instanceof UnsupportedMediaTypeError);
      assert.match(err.message, /signature validation failed/);
      return true;
    });
  });

  await t.test('9. Sanitizes path traversal attempts in filenames', () => {
    const dangerousNames = [
      '../../etc/passwd.pdf',
      '..\\..\\windows\\system32\\drivers.pdf',
      'folder/subfolder/test.pdf',
      'nul\0byte.pdf'
    ];

    for (const name of dangerousNames) {
      const sanitized = sanitizeFilename(name);
      assert.ok(!sanitized.includes('..'), `Sanitized must not contain ..: ${sanitized}`);
      assert.ok(!sanitized.includes('/'), `Sanitized must not contain /: ${sanitized}`);
      assert.ok(!sanitized.includes('\\'), `Sanitized must not contain \\: ${sanitized}`);
      assert.ok(!sanitized.includes('\0'), `Sanitized must not contain null byte: ${sanitized}`);
    }
  });

  await t.test('10. Validates document metadata requirements', () => {
    // Missing both referral_id and patient_id
    assert.throws(
      () => validateDocumentMetadata({ document_category: 'LAB_RESULT' }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );

    // Invalid category
    assert.throws(
      () => validateDocumentMetadata({ patient_id: 'ETH-PAT-001', document_category: 'INVALID_CATEGORY' }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );

    // Valid metadata
    const validMeta = validateDocumentMetadata({
      referral_id: 'ETH-REF-2026-001',
      document_category: 'REFERRAL_LETTER'
    });
    assert.equal(validMeta.referral_id, 'ETH-REF-2026-001');
    assert.equal(validMeta.document_category, 'REFERRAL_LETTER');
  });

  await t.test('11. Validates document replacement requires reason', () => {
    assert.throws(
      () => validateDocumentReplacement({}),
      (err) => {
        assert.ok(err instanceof ValidationError);
        assert.match(err.message, /validation failed/);
        return true;
      }
    );

    const validRepl = validateDocumentReplacement({
      replacement_reason: 'Updated lab test with final pathologist signature'
    });
    assert.equal(validRepl.replacement_reason, 'Updated lab test with final pathologist signature');
  });

  await t.test('12. Validates document verification transitions and rejection reason', () => {
    // Rejection without mandatory reason
    assert.throws(
      () => validateDocumentVerification({ status: 'REJECTED' }),
      (err) => {
        assert.ok(err instanceof ValidationError);
        return true;
      }
    );

    // Valid rejection
    const validRejection = validateDocumentVerification({
      status: 'REJECTED',
      rejection_reason: 'Scan is illegible, missing patient identification stamp'
    });
    assert.equal(validRejection.status, 'REJECTED');
    assert.ok(validRejection.rejection_reason);

    // Valid verification
    const validVerification = validateDocumentVerification({
      status: 'VERIFIED'
    });
    assert.equal(validVerification.status, 'VERIFIED');
  });
});
