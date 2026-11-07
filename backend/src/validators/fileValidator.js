/**
 * CareConnect Ethiopia - Secure File Upload Validation & Inspection Engine
 * Validates file sizes, extensions, MIME types, magic byte signatures,
 * eliminates path traversal vulnerabilities, and computes cryptographic digests.
 */

import crypto from 'crypto';
import path from 'path';
import config from '../config/env.js';
import { ValidationError, PayloadTooLargeError, UnsupportedMediaTypeError } from '../utils/errors.js';

// Allowed extensions and corresponding MIME types & magic signatures
export const ALLOWED_FILE_TYPES = {
  pdf: {
    extension: 'pdf',
    mimeTypes: ['application/pdf'],
    magicBytes: [0x25, 0x50, 0x44, 0x46], // %PDF
    description: 'Portable Document Format'
  },
  jpg: {
    extension: 'jpg',
    mimeTypes: ['image/jpeg', 'image/jpg'],
    magicBytes: [0xff, 0xd8, 0xff],
    description: 'JPEG Image'
  },
  jpeg: {
    extension: 'jpeg',
    mimeTypes: ['image/jpeg', 'image/jpg'],
    magicBytes: [0xff, 0xd8, 0xff],
    description: 'JPEG Image'
  },
  png: {
    extension: 'png',
    mimeTypes: ['image/png'],
    magicBytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    description: 'Portable Network Graphics'
  }
};

// Blacklisted executable and script extensions
const DISALLOWED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bin', 'msi', 'js', 'mjs', 'ts', 'php',
  'py', 'vbs', 'ps1', 'scr', 'jar', 'com', 'pif', 'dll', 'so', 'html',
  'htm', 'svg', 'xhtml', 'jsp', 'asp', 'aspx', 'cgi', 'pl'
]);

/**
 * Sanitizes a client-supplied filename to prevent path traversal or injection.
 * Strips path separators, directory traversal sequences (../, ..\), and null bytes.
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_attachment';
  }

  // Remove null bytes and control characters
  let clean = filename.replace(/[\x00-\x1f\x7f]/g, '');

  // Strip path prefixes (both POSIX and Windows)
  clean = path.basename(clean);
  clean = clean.replace(/\.\.+[/\\]/g, '');
  clean = clean.replace(/^[./\\]+/, '');

  // Collapse multiple spaces or dashes
  clean = clean.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

  if (!clean || clean === '.' || clean === '..') {
    return 'unnamed_attachment';
  }

  return clean;
}

/**
 * Detects whether buffer matches known magic byte signatures
 */
export function detectSignature(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    return null;
  }

  // Check PDF (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }

  // Check JPEG (FF D8 FF)
  if (
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg';
  }

  // Check PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  return null;
}

/**
 * Computes SHA-256 cryptographic checksum of file buffer
 */
export function computeSha256Checksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generates an unguessable safe storage key using UUID and date partitioning.
 * E.g., "docs/2026/11/a9f1a23e-1111-4444-9999-0123456789ab.pdf"
 */
export function generateSafeStorageKey(extension) {
  const cleanExt = (extension || 'bin').toLowerCase().replace(/^\./, '');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const uuid = crypto.randomUUID();
  return `docs/${year}/${month}/${uuid}.${cleanExt}`;
}

/**
 * Validates uploaded file completely:
 * 1. Checks file presence
 * 2. Checks size against maxFileSizeBytes limit
 * 3. Inspects path traversal in filename
 * 4. Checks extension against blacklist and whitelist
 * 5. Checks MIME type
 * 6. Inspects magic bytes signature
 * 7. Asserts consistency between extension, MIME type, and signature
 */
export function validateUploadedFile(file, options = {}) {
  if (!file) {
    throw new ValidationError('No file was provided for upload', [
      { field: 'file', message: 'Attachment file is required' }
    ]);
  }

  const maxSizeBytes = options.maxSizeBytes || config.uploads?.maxFileSizeBytes || 10 * 1024 * 1024;
  const buffer = file.buffer;
  const originalName = file.originalname || file.name || 'unnamed';
  const declaredMime = (file.mimetype || file.type || '').toLowerCase().trim();

  // 1. Path traversal / unsafe filename check
  if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\') || originalName.includes('\0')) {
    // Flag or sanitize; we sanitize safely and preserve safe filename
  }
  const safeFilename = sanitizeFilename(originalName);

  // 2. Check for disallowed extensions
  const parts = originalName.split('.');
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const ext = parts[i].toLowerCase().trim();
      if (DISALLOWED_EXTENSIONS.has(ext)) {
        throw new UnsupportedMediaTypeError(`Potentially dangerous file extension detected (.${ext})`);
      }
    }
  }

  // 3. Extract final extension
  const rawExt = parts.length > 1 ? parts[parts.length - 1].toLowerCase().trim() : '';
  const extKey = rawExt === 'jpeg' ? 'jpeg' : rawExt === 'jpg' ? 'jpg' : rawExt;
  const allowedConfig = ALLOWED_FILE_TYPES[extKey];

  if (!allowedConfig) {
    throw new UnsupportedMediaTypeError(
      `Unsupported file type (.${rawExt}). Only PDF, JPEG, and PNG documents are accepted for medical records.`
    );
  }

  // 4. File size validation
  const size = file.size !== undefined ? file.size : (buffer ? buffer.length : 0);
  if (size <= 0) {
    throw new ValidationError('Uploaded file is empty (0 bytes)', [
      { field: 'file', message: 'File cannot be empty' }
    ]);
  }
  if (size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    throw new PayloadTooLargeError(`File size exceeds the configured maximum limit of ${maxMb}MB`);
  }

  // 5. MIME type validation
  if (!allowedConfig.mimeTypes.includes(declaredMime)) {
    throw new UnsupportedMediaTypeError(
      `Declared MIME type '${declaredMime}' does not match supported formats for .${rawExt} extension`
    );
  }

  // 6. Magic byte / Signature inspection
  if (buffer && buffer.length > 0) {
    const detectedType = detectSignature(buffer);
    if (!detectedType) {
      throw new UnsupportedMediaTypeError(
        'File signature validation failed. File content does not match legitimate PDF, JPEG, or PNG formats.'
      );
    }

    const normalizedExt = (rawExt === 'jpg' || rawExt === 'jpeg') ? 'jpeg' : rawExt;
    if (detectedType !== normalizedExt) {
      throw new UnsupportedMediaTypeError(
        `File signature mismatch: file content appears to be '${detectedType}', but declared extension is '.${rawExt}'`
      );
    }
  }

  const checksum = buffer ? computeSha256Checksum(buffer) : null;
  const storageKey = generateSafeStorageKey(rawExt);

  return {
    originalFilename: safeFilename,
    extension: rawExt,
    mimeType: declaredMime,
    fileSizeBytes: size,
    sha256Checksum: checksum,
    storageKey,
    safeStorageUri: `private://${storageKey}`
  };
}

export default {
  ALLOWED_FILE_TYPES,
  sanitizeFilename,
  detectSignature,
  computeSha256Checksum,
  generateSafeStorageKey,
  validateUploadedFile
};
