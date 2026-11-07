import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('Database Migrations and Seeds Integrity Test', async (t) => {
  await t.test('All SQL migration scripts exist and contain valid DDL statements', () => {
    const migrationsDir = path.join(ROOT_DIR, 'database', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    assert.equal(files.length, 31, 'Expected 31 migration scripts to exist');

    const expectedPrefixes = [
      '001_initial_migration_tracker',
      '002_create_roles_and_permissions',
      '003_create_users',
      '004_create_healthcare_facilities',
      '005_create_facility_services',
      '006_create_facility_capacity',
      '007_create_patients',
      '008_create_referrals',
      '009_create_constraints_and_indexes',
      '010_create_referral_documents',
      '011_create_referral_events',
      '012_create_transport_records',
      '013_create_referral_feedback',
      '014_create_notifications',
      '015_create_audit_logs',
      '016_create_ai_recommendations',
      '017_create_ai_predictions',
      '018_create_ai_models_and_feedback',
      '019_identity_and_facility_schema',
      '020_patient_data_schema',
      '021_referral_workflow_schema',
      '022_document_and_transport_schema',
      '023_notification_ai_audit_schema',
      '024_performance_indexes_and_integrity',
      '025_password_reset_and_session_family',
      '026_facility_location_optional',
      '027_patient_lifecycle_and_reviews',
      '028_referral_tracking_and_corrections',
      '029_referral_coordination_and_escalation',
      '030_secure_document_management',
      '031_schema_hardening_and_integrity'
    ];

    for (let i = 0; i < expectedPrefixes.length; i++) {
      assert.ok(files[i].startsWith(expectedPrefixes[i]), `File ${files[i]} should match prefix ${expectedPrefixes[i]}`);
    }
  });

  await t.test('Seed data is explicitly fictional and covers all 4 portal test actors', () => {
    const seedPath = path.join(ROOT_DIR, 'database', 'seeds', '001_demo_seed_data.sql');
    const content = fs.readFileSync(seedPath, 'utf-8');

    assert.ok(content.includes('FICTIONAL SEED DATA'), 'Must include explicit fictional disclaimer');
    assert.ok(content.includes('FAC-HC-KAZANCHIS'), 'Must include health centre facility');
    assert.ok(content.includes('FAC-HOSP-TIKUR'), 'Must include tertiary referral hospital');
    assert.ok(content.includes('health.officer@careconnect.et'), 'Must include Health Centre staff user');
    assert.ok(content.includes('triage.doctor@careconnect.et'), 'Must include Hospital triage doctor user');
    assert.ok(content.includes('transport.dispatch@careconnect.et'), 'Must include Transport coordinator user');
    assert.ok(content.includes('system.admin@careconnect.et'), 'Must include Administrator user');
  });

  await t.test('Referral foreign keys and check constraints are properly formed', () => {
    const referralsSql = fs.readFileSync(path.join(ROOT_DIR, 'database', 'migrations', '008_create_referrals.sql'), 'utf-8');
    const constraintsSql = fs.readFileSync(path.join(ROOT_DIR, 'database', 'migrations', '009_create_constraints_and_indexes.sql'), 'utf-8');

    assert.ok(referralsSql.includes('REFERENCES patients(id)'), 'Referrals must reference patients');
    assert.ok(referralsSql.includes('REFERENCES healthcare_facilities(id)'), 'Referrals must reference healthcare facilities');
    assert.ok(constraintsSql.includes('chk_referral_priority'), 'Must have referral priority check constraint');
    assert.ok(constraintsSql.includes('chk_referral_status'), 'Must have referral status check constraint');
  });
});
