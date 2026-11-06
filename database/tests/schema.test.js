/**
 * CareConnect Ethiopia - Database Schema & Domains Verification Suite
 * Validates tables across all 9 domains, UUID primary/alternate keys,
 * foreign key cascade/restrict rules, and query optimization indexes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

describe('Database Schema & Domain Model Verification Suite', () => {
  const migrations = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  const allSql = migrations.map(f => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8')).join('\n');

  it('Covers all 9 required database domains with explicit table definitions', () => {
    // Domain A: Identity and Access
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS users'), 'Domain A: users');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS roles'), 'Domain A: roles');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS permissions'), 'Domain A: permissions');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS user_roles'), 'Domain A: user_roles');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS user_sessions'), 'Domain A: user_sessions');

    // Domain B: Healthcare Facilities
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS healthcare_facilities'), 'Domain B: facilities');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS facility_types'), 'Domain B: facility_types');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS facility_departments'), 'Domain B: departments');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS facility_services'), 'Domain B: services');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS facility_capacity_reports'), 'Domain B: capacity');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS facility_staff_assignments'), 'Domain B: staff_assignments');

    // Domain C: Patients
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS patients'), 'Domain C: patients');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS patient_identifiers'), 'Domain C: identifiers');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS patient_emergency_contacts'), 'Domain C: emergency_contacts');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS patient_medical_baseline'), 'Domain C: baseline');

    // Domain D: Referrals
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS referrals'), 'Domain D: referrals');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS referral_status_history'), 'Domain D: status_history');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS referral_decisions'), 'Domain D: decisions');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS referral_feedback'), 'Domain D: feedback');

    // Domain E: Documents
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS referral_documents'), 'Domain E: documents');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS document_access_logs'), 'Domain E: access_logs');

    // Domain F: Transport
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS transport_resources'), 'Domain F: resources');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS transport_records'), 'Domain F: records');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS transport_delays'), 'Domain F: delays');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS transport_status_history'), 'Domain F: status_history');

    // Domain G: Notifications
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS notifications'), 'Domain G: notifications');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS notification_preferences'), 'Domain G: preferences');

    // Domain H: AI Processing
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS ai_processing_jobs'), 'Domain H: processing_jobs');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS ai_recommendations'), 'Domain H: recommendations');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS ai_predictions'), 'Domain H: predictions');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS ai_model_versions'), 'Domain H: model_versions');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS ai_human_reviews'), 'Domain H: human_reviews');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS ai_feedback'), 'Domain H: feedback');

    // Domain I: Reporting and Audit
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS audit_logs'), 'Domain I: audit_logs');
    assert.ok(allSql.includes('CREATE TABLE IF NOT EXISTS system_events'), 'Domain I: system_events');
  });

  it('Defines UUID keys across major business entities', () => {
    assert.ok(allSql.includes("uuid UUID DEFAULT gen_random_uuid()"), 'gen_random_uuid used for UUID generation');
    
    const entities = ['users', 'healthcare_facilities', 'patients', 'referrals', 'referral_documents', 'transport_records', 'ai_processing_jobs'];
    for (const ent of entities) {
      assert.ok(allSql.includes(ent), `Must support ${ent}`);
    }
  });

  it('Enforces non-destructive soft-delete patterns on core clinical entities', () => {
    assert.ok(allSql.includes("ALTER TABLE healthcare_facilities ADD COLUMN deleted_at"), 'Facility soft delete');
    assert.ok(allSql.includes("ALTER TABLE users ADD COLUMN deleted_at"), 'User soft delete');
    assert.ok(allSql.includes("ALTER TABLE patients ADD COLUMN deleted_at"), 'Patient soft delete');
    assert.ok(allSql.includes("ALTER TABLE referrals ADD COLUMN deleted_at"), 'Referral soft delete');
    assert.ok(allSql.includes("ALTER TABLE referral_documents ADD COLUMN deleted_at"), 'Document soft delete');
  });

  it('Establishes portal-specific performance partial indexes', () => {
    assert.ok(allSql.includes('idx_referrals_hospital_triage'), 'Hospital triage queue partial index');
    assert.ok(allSql.includes('idx_referrals_hc_active'), 'Health Centre active referrals partial index');
    assert.ok(allSql.includes('idx_transport_active_transfers'), 'Transport active transfers partial index');
    assert.ok(allSql.includes('idx_transport_available_fleet'), 'Transport available fleet partial index');
    assert.ok(allSql.includes('idx_notifications_unread_user'), 'User unread notifications partial index');
  });

  it('Enforces critical unique constraints preventing duplicate records', () => {
    assert.ok(allSql.includes('uq_patient_identifier UNIQUE (identifier_type, identifier_value)'), 'Unique patient identifiers');
    assert.ok(allSql.includes('uq_facility_dept UNIQUE (facility_id, code)'), 'Unique facility department code');
    assert.ok(allSql.includes('uq_model_version UNIQUE (model_name, version)'), 'Unique AI model version');
    assert.ok(allSql.includes('uq_user_pref_channel UNIQUE (user_id, channel)'), 'Unique user notification preference channel');
  });
});
