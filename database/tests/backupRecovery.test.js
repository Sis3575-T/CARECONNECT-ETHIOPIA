/**
 * CareConnect Ethiopia - Backup & Disaster Recovery Verification Test Suite
 * Tests backup manifest generation, integrity checking, and recovery objectives.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateBackupManifest, createBackup } from '../../scripts/backup-db.js';
import { verifyBackupFile } from '../../scripts/verify-backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.join(ROOT_DIR, 'database', 'backups');

describe('Database Backup & Recovery Operations Suite — Commit 079', () => {
  it('generateBackupManifest constructs valid metadata with RPO and RTO objectives', () => {
    const manifest = generateBackupManifest({
      filename: 'careconnect_schema_test.sql',
      filepath: '/tmp/test.sql',
      sizeBytes: 1024,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      schemaOnly: true,
      dbInfo: { provider: 'Neon Cloud' }
    });

    assert.equal(manifest.manifestVersion, '1.0.0');
    assert.equal(manifest.filename, 'careconnect_schema_test.sql');
    assert.equal(manifest.sizeBytes, 1024);
    assert.equal(manifest.sha256Checksum.length, 64);
    assert.equal(manifest.schemaOnly, true);
    assert.equal(manifest.retention.targetRPOHours, 1);
    assert.equal(manifest.retention.targetRTOMinutes, 30);
  });

  it('createBackup executes successfully and generates valid backup file and manifest', async () => {
    const result = await createBackup({ schemaOnly: true });

    assert.equal(result.success, true);
    if (result.filepath) {
      assert.ok(fs.existsSync(result.filepath), 'Backup file must exist on disk');
      const manifestPath = `${result.filepath}.manifest.json`;
      assert.ok(fs.existsSync(manifestPath), 'Manifest file must exist on disk');

      // Verify the generated backup file using verifyBackupFile
      const verifyRes = verifyBackupFile(manifestPath);
      assert.equal(verifyRes.valid, true, 'Newly generated backup must pass checksum verification');
      assert.equal(verifyRes.checksumMatch, true);
      assert.equal(verifyRes.sizeMatch, true);

      // Clean up test generated backup files to keep workspace tidy
      try {
        fs.unlinkSync(result.filepath);
        fs.unlinkSync(manifestPath);
      } catch {}
    }
  });

  it('verifyBackupFile detects corrupted or tampered files', () => {
    const testFile = path.join(BACKUP_DIR, 'test_tampered.sql');
    const testManifest = path.join(BACKUP_DIR, 'test_tampered.sql.manifest.json');

    try {
      fs.writeFileSync(testFile, 'SELECT 1;', 'utf-8');
      const manifestData = generateBackupManifest({
        filename: 'test_tampered.sql',
        filepath: testFile,
        sizeBytes: 8,
        checksum: '1111111111111111111111111111111111111111111111111111111111111111', // Intentional mismatch
        schemaOnly: true
      });
      fs.writeFileSync(testManifest, JSON.stringify(manifestData, null, 2), 'utf-8');

      const verifyRes = verifyBackupFile(testManifest);
      assert.equal(verifyRes.valid, false, 'Tampered file must fail verification');
      assert.equal(verifyRes.checksumMatch, false, 'Checksum mismatch must be flagged');
    } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(testManifest)) fs.unlinkSync(testManifest);
    }
  });
});
