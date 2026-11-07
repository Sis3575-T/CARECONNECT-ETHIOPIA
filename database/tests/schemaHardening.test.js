/**
 * CareConnect Ethiopia - Schema Hardening & Integrity Verification Suite
 * Tests migration 031 DDL rules, check constraints, foreign key bindings,
 * and data integrity validations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATION_PATH = path.join(__dirname, '..', 'migrations', '031_schema_hardening_and_integrity.sql');

describe('Schema Hardening & Integrity Suite — Commit 073', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf-8');

  it('Migration 031 exists and defines hardened constraints and foreign keys', () => {
    assert.ok(sql.length > 500, 'Migration 031 must contain substantial DDL rules');
    assert.ok(sql.includes('chk_referral_status'), 'Must define hardened referral status constraint');
    assert.ok(sql.includes('fk_referrals_policy'), 'Must define referral policy foreign key');
    assert.ok(sql.includes('chk_patient_status'), 'Must define patient status constraint');
    assert.ok(sql.includes('chk_merge_different_patients'), 'Must define patient merge reflexive guard');
    assert.ok(sql.includes('chk_document_verification_status'), 'Must define document verification constraint');
    assert.ok(sql.includes('chk_document_processing_status'), 'Must define document processing constraint');
    assert.ok(sql.includes('chk_escalation_level'), 'Must define escalation level constraint');
    assert.ok(sql.includes('chk_sla_ack_positive'), 'Must define positive SLA deadline check');
  });

  it('Enforces all 16 referral lifecycle statuses in chk_referral_status', () => {
    const expectedStatuses = [
      'DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'ASSIGNED',
      'ACKNOWLEDGED', 'ACCEPTED', 'REJECTED', 'INFO_REQUESTED',
      'TRANSPORT_ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'PATIENT_ARRIVED',
      'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED'
    ];

    for (const status of expectedStatuses) {
      assert.ok(sql.includes(`'${status}'`), `chk_referral_status must include ${status}`);
    }
  });

  it('Binds referrals to referral_response_policies via foreign key with SET NULL', () => {
    assert.ok(sql.includes('FOREIGN KEY (policy_id) REFERENCES referral_response_policies(id)'), 'Must reference referral_response_policies');
    assert.ok(sql.includes('ON DELETE SET NULL'), 'Must protect historical referrals on policy deletion');
  });

  it('Guarantees document verification statuses and versioning rules', () => {
    const docStatuses = ['UPLOADED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REQUIRES_CORRECTION', 'ARCHIVED'];
    for (const st of docStatuses) {
      assert.ok(sql.includes(`'${st}'`), `chk_document_verification_status must include ${st}`);
    }
    assert.ok(sql.includes('version_number > 0'), 'Version numbers must be strictly positive');
  });

  it('Prevents reflexive patient merging and enforces valid merge status transitions', () => {
    assert.ok(sql.includes('source_patient_id <> target_patient_id'), 'Source and target patients must differ');
    assert.ok(sql.includes("'PENDING', 'APPROVED', 'REJECTED'"), 'Merge status must be PENDING, APPROVED, or REJECTED');
  });
});
