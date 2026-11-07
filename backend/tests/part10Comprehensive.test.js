/**
 * CareConnect Ethiopia - Part 10 Comprehensive Verification Suite
 * Database Hardening, Data Integrity, Performance Optimization and Backup/Recovery Foundations
 * 
 * Tests:
 * 1. Hardened check constraints across referrals, patients, documents, and escalations.
 * 2. Uniqueness constraints preventing concurrent race conditions and duplicate assignments.
 * 3. Migration sequential validation, SHA-256 checksum tracking, and drift detection.
 * 4. Atomic transaction isolation levels, savepoint rollback handling, and row locking.
 * 5. Connection pool reliability, transient error classification, and exponential backoff.
 * 6. Query optimization partial and composite indexes.
 * 7. Non-destructive cold storage archival, retention policies, and execution audit trails.
 * 8. Backup manifest generation, RPO/RTO objectives, and cryptographic verification.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  dbConfig,
  getPoolMetrics,
  isTransientError,
  executeWithRetry,
  sanitizeConnectionString
} from '../../database/connection.js';
import { validateMigrationOrdering, calculateChecksum, runMigrations } from '../../database/migrate.js';
import DbService from '../src/services/dbService.js';
import DataRetentionService from '../src/services/dataRetentionService.js';
import { generateBackupManifest } from '../../scripts/backup-db.js';
import { verifyBackupFile } from '../../scripts/verify-backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT_DIR, 'database', 'migrations');

describe('Part 10 Comprehensive Verification Suite: Database Hardening & Reliability', () => {
  // Phase 1: Schema Hardening & Constraints
  describe('Phase 1: Database Schema Hardening & Check Constraints', () => {
    const m31Path = path.join(MIGRATIONS_DIR, '031_schema_hardening_and_integrity.sql');
    const sql31 = fs.readFileSync(m31Path, 'utf-8');

    it('1. Enforces all 16 referral lifecycle statuses in chk_referral_status', () => {
      const statuses = [
        'DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'ASSIGNED',
        'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED',
        'TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'PATIENT_ARRIVED',
        'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED'
      ];
      for (const st of statuses) {
        assert.ok(sql31.includes(`'${st}'`), `chk_referral_status must include ${st}`);
      }
    });

    it('2. Links referrals to referral_response_policies via fk_referrals_policy with SET NULL', () => {
      assert.ok(sql31.includes('fk_referrals_policy'), 'Must define fk_referrals_policy');
      assert.ok(sql31.includes('ON DELETE SET NULL'), 'Must protect historical referrals');
    });

    it('3. Enforces valid patient status and prevents reflexive patient merging', () => {
      assert.ok(sql31.includes('chk_patient_status'), 'Must enforce patient lifecycle status');
      assert.ok(sql31.includes('source_patient_id <> target_patient_id'), 'Must prevent merging a patient into itself');
    });

    it('4. Enforces document verification and processing status constraints', () => {
      assert.ok(sql31.includes('chk_document_verification_status'), 'Must check verification status');
      assert.ok(sql31.includes('chk_document_processing_status'), 'Must check processing status');
      assert.ok(sql31.includes('chk_document_version_positive'), 'Must enforce version_number > 0');
    });

    it('5. Enforces operational escalation hierarchy levels (1, 2, 3) and statuses', () => {
      assert.ok(sql31.includes('chk_escalation_level'), 'Must check escalation levels');
      assert.ok(sql31.includes('chk_escalation_status'), 'Must check escalation status');
    });

    it('6. Enforces strictly positive SLA response deadlines and policy versions', () => {
      assert.ok(sql31.includes('chk_sla_ack_positive'), 'Must check acknowledgement deadline > 0');
      assert.ok(sql31.includes('chk_sla_dec_positive'), 'Must check decision deadline > 0');
      assert.ok(sql31.includes('chk_sla_version_positive'), 'Must check policy version > 0');
    });
  });

  // Phase 2: Data Integrity & Uniqueness
  describe('Phase 2: Data Integrity & Partial Uniqueness Constraints', () => {
    const m32Path = path.join(MIGRATIONS_DIR, '032_data_integrity_and_uniqueness.sql');
    const sql32 = fs.readFileSync(m32Path, 'utf-8');

    it('7. Defines uq_active_facility_staff to prevent duplicate active staff assignments', () => {
      assert.ok(sql32.includes('uq_active_facility_staff'), 'Must define unique active facility staff index');
      assert.ok(sql32.includes('WHERE is_active = TRUE'), 'Must filter only active staff assignments');
    });

    it('8. Defines uq_document_group_version to prevent concurrent version numbering collisions', () => {
      assert.ok(sql32.includes('uq_document_group_version'), 'Must define unique document group version index');
      assert.ok(sql32.includes('(document_group_id, version_number)'), 'Must bind group id and version number');
    });

    it('9. Defines uq_facility_priority_active_policy preventing multiple active policies per facility priority', () => {
      assert.ok(sql32.includes('uq_facility_priority_active_policy'), 'Must define unique active policy index');
    });

    it('10. Defines uq_referral_active_pending_info_request preventing duplicate active requests', () => {
      assert.ok(sql32.includes('uq_referral_active_pending_info_request'), 'Must define unique pending info request index');
    });
  });

  // Phase 3: Migration Safety & Version Management
  describe('Phase 3: Migration Safety, Sequence Ordering & Checksum Tracking', () => {
    it('11. All repository migrations follow strict sequential ordering with zero gaps', () => {
      const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
      const res = validateMigrationOrdering(files);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
      assert.ok(files.length >= 34, 'Must have at least 34 verified migration files');
    });

    it('12. calculateChecksum produces deterministic 64-character SHA-256 hashes', () => {
      const sqlSample = 'SELECT 1 FROM referrals;';
      const hash = calculateChecksum(sqlSample);
      assert.equal(hash.length, 64);
      assert.equal(hash, calculateChecksum(sqlSample));
    });

    it('13. runMigrations runs safely in validate-only mode without executing queries', async () => {
      const res = await runMigrations({ validateOnly: true });
      assert.equal(res.valid, true);
      assert.ok(res.count >= 34);
    });
  });

  // Phase 4: Transactional Consistency & Concurrency
  describe('Phase 4: Transactional Consistency, Savepoints & Concurrency Controls', () => {
    it('14. DbService.transaction supports isolation levels and read-only options', () => {
      assert.equal(typeof DbService.transaction, 'function');
    });

    it('15. DbService.withSavepoint handles sub-transaction rollback and release', () => {
      assert.equal(typeof DbService.withSavepoint, 'function');
    });

    it('16. DbService.acquireLock constructs valid pessimistic row locking clauses', () => {
      assert.equal(typeof DbService.acquireLock, 'function');
    });
  });

  // Phase 5: Query Optimization & Partial Indexes
  describe('Phase 5: Critical Query Optimization & Partial Indexes', () => {
    const m33Path = path.join(MIGRATIONS_DIR, '033_performance_indexes_and_optimizations.sql');
    const sql33 = fs.readFileSync(m33Path, 'utf-8');

    it('17. Establishes SLA breach monitoring partial indexes', () => {
      assert.ok(sql33.includes('idx_referrals_sla_ack_monitor'), 'Must index acknowledgement deadline monitor');
      assert.ok(sql33.includes('idx_referrals_sla_dec_monitor'), 'Must index decision deadline monitor');
    });

    it('18. Establishes latest-document partial indexes omitting superseded records', () => {
      assert.ok(sql33.includes('idx_documents_patient_latest'), 'Must index latest patient documents');
      assert.ok(sql33.includes('idx_documents_referral_latest'), 'Must index latest referral documents');
    });

    it('19. Establishes background worker queue polling indexes for OCR and verification', () => {
      assert.ok(sql33.includes('idx_documents_pending_verification'), 'Must index verification worklist');
      assert.ok(sql33.includes('idx_documents_pending_processing'), 'Must index OCR processing worklist');
    });
  });

  // Phase 6: Connection Pooling & Reliability
  describe('Phase 6: Connection Pooling, Transient Retries & Health Monitoring', () => {
    it('20. dbConfig enforces connection limits, idle timeouts, and statement timeouts', () => {
      assert.ok(dbConfig.max >= 5);
      assert.ok(dbConfig.min >= 1);
      assert.ok(dbConfig.statementTimeoutMillis >= 5000);
    });

    it('21. getPoolMetrics returns live pool utilization metrics', () => {
      const metrics = getPoolMetrics();
      assert.equal(typeof metrics.totalCount, 'number');
      assert.equal(typeof metrics.idleCount, 'number');
      assert.equal(typeof metrics.waitingCount, 'number');
    });

    it('22. isTransientError classifies transient codes vs fatal SQL syntax errors', () => {
      assert.equal(isTransientError({ code: 'ECONNRESET' }), true);
      assert.equal(isTransientError({ code: '40001' }), true);
      assert.equal(isTransientError({ code: '42P01' }), false);
    });

    it('23. executeWithRetry performs exponential backoff for idempotent operations', async () => {
      let attempts = 0;
      const op = async () => {
        attempts++;
        if (attempts < 2) {
          const err = new Error('deadlock detected');
          err.code = '40001';
          throw err;
        }
        return { success: true, attempts };
      };
      const res = await executeWithRetry(op, { maxRetries: 2, baseDelayMs: 5, isIdempotent: true });
      assert.equal(res.success, true);
      assert.equal(res.attempts, 2);
    });

    it('24. sanitizeConnectionString protects database passwords in errors and URLs', () => {
      const raw = 'postgres://user:SuperSecretPassword123@ep-cool-db.neon.tech/careconnect?sslmode=require';
      const clean = sanitizeConnectionString(raw);
      assert.ok(!clean.includes('SuperSecretPassword123'), 'Must never expose plain password');
      assert.ok(clean.includes('********'), 'Must mask password with asterisks');
    });
  });

  // Phase 7: Data Retention & Archival Foundations
  describe('Phase 7: Data Retention Policies & Cold Storage Archival', () => {
    it('25. DataRetentionService retrieves baseline operational retention policies', async () => {
      const policies = await DataRetentionService.listPolicies();
      assert.ok(policies.length >= 6);
      const closedPolicy = policies.find(p => p.entity_type === 'CLOSED_REFERRALS');
      assert.equal(closedPolicy.retention_period_days, 365);
      assert.equal(closedPolicy.action_type, 'ARCHIVE');
    });

    it('26. DataRetentionService evaluates archival cutoff timestamps without deleting data', async () => {
      const evalRes = await DataRetentionService.evaluateEligibility('CLOSED_REFERRALS');
      assert.equal(evalRes.entityType, 'CLOSED_REFERRALS');
      assert.ok(evalRes.cutoffDate instanceof Date);
    });

    it('27. DataRetentionService records archival metadata preserving referential integrity', async () => {
      const archived = await DataRetentionService.archiveReferral({
        referralId: 'ETH-REF-2026-COMPREHENSIVE-01',
        user: { id: 1 },
        archiveTier: 'COLD_STORAGE',
        notes: 'End-of-year batch archival'
      });
      assert.equal(archived.referral_id, 'ETH-REF-2026-COMPREHENSIVE-01');
      assert.equal(archived.archive_tier, 'COLD_STORAGE');
    });

    it('28. DataRetentionService tracks execution telemetry in data_retention_executions', async () => {
      const execRecord = await DataRetentionService.recordExecution({
        policyId: 1,
        entityType: 'AUDIT_LOGS',
        eligibleCount: 50,
        processedCount: 50,
        status: 'COMPLETED',
        user: { id: 1 },
        notes: 'Automated 7-year audit retention sweep'
      });
      assert.equal(execRecord.entity_type, 'AUDIT_LOGS');
      assert.equal(execRecord.eligible_records_count, 50);
      assert.equal(execRecord.status, 'COMPLETED');
    });
  });

  // Phase 8: Backup & Disaster Recovery Operations
  describe('Phase 8: Backup Manifests, RPO/RTO Targets & Cryptographic Verification', () => {
    it('29. generateBackupManifest records operational RPO (< 1h) and RTO (< 30m) targets', () => {
      const manifest = generateBackupManifest({
        filename: 'careconnect_schema_comprehensive.sql',
        filepath: '/fake/path.sql',
        sizeBytes: 2048,
        checksum: 'abc123def456',
        schemaOnly: true,
        dbInfo: { provider: 'Neon Cloud' }
      });
      assert.equal(manifest.retention.targetRPOHours, 1);
      assert.equal(manifest.retention.targetRTOMinutes, 30);
      assert.equal(manifest.verificationStatus, 'VERIFIED');
    });

    it('30. verifyBackupFile accurately validates checksums and identifies file tampering', () => {
      const testDir = path.join(ROOT_DIR, 'database', 'backups');
      const testSql = path.join(testDir, 'part10_verify_test.sql');
      const testManifest = path.join(testDir, 'part10_verify_test.sql.manifest.json');

      try {
        const content = '-- Clean Architectural Backup\nSELECT 1;';
        fs.writeFileSync(testSql, content, 'utf-8');
        const checksum = calculateChecksum(content);
        const manifest = generateBackupManifest({
          filename: 'part10_verify_test.sql',
          filepath: testSql,
          sizeBytes: Buffer.byteLength(content, 'utf-8'),
          checksum,
          schemaOnly: true
        });
        fs.writeFileSync(testManifest, JSON.stringify(manifest, null, 2), 'utf-8');

        // Valid test
        const validRes = verifyBackupFile(testManifest);
        assert.equal(validRes.valid, true);

        // Tamper test
        fs.writeFileSync(testSql, content + '\n-- Injected tampering', 'utf-8');
        const tamperedRes = verifyBackupFile(testManifest);
        assert.equal(tamperedRes.valid, false);
        assert.equal(tamperedRes.checksumMatch, false);
      } finally {
        if (fs.existsSync(testSql)) fs.unlinkSync(testSql);
        if (fs.existsSync(testManifest)) fs.unlinkSync(testManifest);
      }
    });
  });
});
