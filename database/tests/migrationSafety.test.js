/**
 * CareConnect Ethiopia - Migration Safety & Version Management Verification Suite
 * Tests sequential ordering validation, SHA-256 checksum tracking,
 * and dry-run execution modes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateChecksum, validateMigrationOrdering, runMigrations } from '../migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

describe('Migration Safety & Version Management Suite — Commit 075', () => {
  it('calculateChecksum computes deterministic SHA-256 hex strings', () => {
    const testSql = 'CREATE TABLE test_table (id SERIAL PRIMARY KEY);';
    const hash1 = calculateChecksum(testSql);
    const hash2 = calculateChecksum(testSql);

    assert.equal(hash1, hash2, 'Checksums must be deterministic');
    assert.equal(hash1.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
  });

  it('validateMigrationOrdering validates all active repository migrations without errors', () => {
    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
    const result = validateMigrationOrdering(files);

    assert.equal(result.valid, true, `Migration sequence must be valid. Errors: ${result.errors.join(', ')}`);
    assert.equal(result.errors.length, 0, 'Must have zero sequence errors');
    assert.equal(result.versions.length, files.length, 'Must parse all versions');
  });

  it('validateMigrationOrdering detects non-sequential numbers or malformed names', () => {
    const badFiles = ['001_initial.sql', '003_gap.sql']; // Missing 002
    const result = validateMigrationOrdering(badFiles);

    assert.equal(result.valid, false, 'Must flag missing sequence number 002');
    assert.ok(result.errors.some(e => e.includes('sequence mismatch')), 'Must describe sequence mismatch');

    const malformedFiles = ['invalid_prefix.sql'];
    const malformedResult = validateMigrationOrdering(malformedFiles);
    assert.equal(malformedResult.valid, false, 'Must reject files without 3-digit prefix');
  });

  it('runMigrations runs safely in offline validation mode and returns checksum summaries', async () => {
    const res = await runMigrations({ dryRun: false, statusOnly: false });

    assert.ok(res.mode === 'offline-validated' || res.mode === 'connected', 'Must run in valid mode');
    if (res.mode === 'offline-validated') {
      assert.ok(res.validationSummary.length >= 32, 'Must validate all 32 migrations');
      const sample = res.validationSummary[0];
      assert.ok(sample.file, 'Must have file name');
      assert.ok(sample.hash.length === 64, 'Must have valid SHA-256 hash');
      assert.ok(sample.sizeBytes > 0, 'Must have positive byte count');
    }
  });

  it('runMigrations supports validateOnly mode', async () => {
    const res = await runMigrations({ validateOnly: true });
    assert.equal(res.valid, true, 'Validation mode must report valid sequence');
    assert.ok(res.count >= 32, 'Must cover at least 32 migrations');
  });
});
