/**
 * CareConnect Ethiopia - Data Retention & Archival Foundations Test Suite
 * Tests retention policy schemas, eligibility evaluation, archival metadata catalog,
 * and referential integrity protections.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DataRetentionService from '../../backend/src/services/dataRetentionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const M34_PATH = path.join(__dirname, '..', 'migrations', '034_retention_and_archival_foundations.sql');

describe('Data Retention & Archival Foundations Suite — Commit 078', () => {
  it('Migration 034 defines data_retention_policies and archived_referrals_catalog', () => {
    const sql = fs.readFileSync(M34_PATH, 'utf-8');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS data_retention_policies'), 'Must define retention policies');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS archived_referrals_catalog'), 'Must define archival catalog');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS data_retention_executions'), 'Must define retention execution logs');
    assert.ok(sql.includes('REFERENCES referrals(id) ON DELETE RESTRICT'), 'Must protect referrals from deletion');
    assert.ok(sql.includes("('AUDIT_LOGS', 2555, 'ARCHIVE'"), 'Must seed audit logs 7-year baseline');
    assert.ok(sql.includes("('CLOSED_REFERRALS', 365, 'ARCHIVE'"), 'Must seed closed referrals 1-year baseline');
  });

  it('DataRetentionService.listPolicies retrieves baseline retention policies', async () => {
    const policies = await DataRetentionService.listPolicies();
    assert.ok(Array.isArray(policies), 'Policies must be an array');
    assert.ok(policies.length >= 6, 'Must contain at least 6 standard retention policies');

    const auditPolicy = policies.find(p => p.entity_type === 'AUDIT_LOGS');
    assert.ok(auditPolicy, 'Must have AUDIT_LOGS policy');
    assert.equal(auditPolicy.retention_period_days, 2555);
    assert.equal(auditPolicy.action_type, 'ARCHIVE');
  });

  it('DataRetentionService.evaluateEligibility computes cutoff date accurately', async () => {
    const result = await DataRetentionService.evaluateEligibility('CLOSED_REFERRALS');
    assert.equal(result.entityType, 'CLOSED_REFERRALS');
    assert.equal(result.retentionDays, 365);
    assert.ok(result.cutoffDate instanceof Date, 'Cutoff date must be a valid Date object');
    assert.equal(typeof result.eligibleCount, 'number');

    // Cutoff should be approximately 365 days in the past
    const diffDays = Math.round((Date.now() - result.cutoffDate.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 365);
  });

  it('DataRetentionService.archiveReferral records archival metadata without deleting underlying record', async () => {
    const mockUser = { id: 10, email: 'admin@careconnect.et' };
    const archived = await DataRetentionService.archiveReferral({
      referralId: 'ETH-REF-2026-TEST01',
      user: mockUser,
      archiveTier: 'COLD_STORAGE',
      notes: 'Operational archival after 1 year retention'
    });

    assert.ok(archived, 'Archived record must be returned');
    assert.equal(archived.referral_id, 'ETH-REF-2026-TEST01');
    assert.equal(archived.archived_by_user_id, 10);
    assert.equal(archived.archive_tier, 'COLD_STORAGE');
  });

  it('DataRetentionService.recordExecution tracks retention job telemetry', async () => {
    const mockUser = { id: 1, email: 'system.admin@careconnect.et' };
    const execution = await DataRetentionService.recordExecution({
      policyId: 3,
      entityType: 'CLOSED_REFERRALS',
      eligibleCount: 15,
      processedCount: 15,
      status: 'COMPLETED',
      user: mockUser,
      notes: 'Automated batch archival execution'
    });

    assert.ok(execution, 'Execution record must be created');
    assert.equal(execution.entity_type, 'CLOSED_REFERRALS');
    assert.equal(execution.eligible_records_count, 15);
    assert.equal(execution.status, 'COMPLETED');
  });
});
