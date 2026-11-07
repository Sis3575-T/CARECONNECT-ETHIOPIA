/**
 * CareConnect Ethiopia - Backup Verification Utility
 * Validates integrity of database backups against cryptographic manifests.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_DIR = path.join(ROOT_DIR, 'database', 'backups');

export function verifyBackupFile(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at path: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const backupPath = path.join(path.dirname(manifestPath), manifest.filename);

  if (!fs.existsSync(backupPath)) {
    return {
      valid: false,
      error: `Associated backup file missing: ${manifest.filename}`,
      manifest
    };
  }

  const fileContent = fs.readFileSync(backupPath, 'utf-8');
  const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');
  const actualSize = Buffer.byteLength(fileContent, 'utf-8');

  const checksumMatch = actualChecksum === manifest.sha256Checksum;
  const sizeMatch = actualSize === manifest.sizeBytes;

  return {
    valid: checksumMatch && sizeMatch,
    checksumMatch,
    sizeMatch,
    expectedChecksum: manifest.sha256Checksum,
    actualChecksum,
    filename: manifest.filename,
    sizeBytes: actualSize,
    manifest
  };
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('verify-backup.js')) {
  const manifests = fs.existsSync(BACKUP_DIR)
    ? fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.manifest.json'))
    : [];

  if (manifests.length === 0) {
    console.log('[CareConnect Backup Verification] No backup manifests found to verify.');
    process.exit(0);
  }

  console.log(`[CareConnect Backup Verification] Verifying ${manifests.length} backup manifests...\n`);
  let allValid = true;

  for (const m of manifests) {
    const fullPath = path.join(BACKUP_DIR, m);
    const result = verifyBackupFile(fullPath);
    if (result.valid) {
      console.log(`  ✔ [PASS] ${result.filename} (Checksum & Size Verified)`);
    } else {
      console.error(`  ✖ [FAIL] ${result.filename}: ${result.error || 'Checksum mismatch'}`);
      allValid = false;
    }
  }

  process.exit(allValid ? 0 : 1);
}
