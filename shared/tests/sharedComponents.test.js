import test from 'node:test';
import assert from 'node:assert/strict';

import { cn } from '../utils/cn.js';
import {
  formatClinicalDate,
  formatRelativeTime,
  formatEthiopianPhone,
  formatPatientId,
  truncateText
} from '../utils/formatters.js';
import { storage } from '../utils/storage.js';
import { TRIAGE_PRIORITIES, getTriageMeta } from '../constants/triage.js';
import { PORTALS, getPortalById } from '../constants/portals.js';
import { ROLES, ROLE_LABELS, PERMISSIONS } from '../constants/roles.js';

test('Shared Component Utilities & Constants Suite — Commit 115', async (t) => {
  await t.test('1. cn() utility merges string, array, and object class inputs correctly', () => {
    assert.equal(cn('px-4', 'py-2'), 'px-4 py-2');
    assert.equal(cn('btn', { 'btn-primary': true, 'btn-disabled': false }), 'btn btn-primary');
    assert.equal(cn('base', ['item-1', null, undefined, 'item-2']), 'base item-1 item-2');
    assert.equal(cn('', null, undefined, false), '');
  });

  await t.test('2. formatClinicalDate formats ISO strings into readable UK/Ethiopian dates', () => {
    const formatted = formatClinicalDate('2026-11-07T10:30:00.000Z', false);
    assert.match(formatted, /7 Nov 2026|07 Nov 2026/);

    const withTime = formatClinicalDate('2026-11-07T10:30:00.000Z', true);
    assert.match(withTime, /2026/);

    assert.equal(formatClinicalDate(null), '—');
    assert.equal(formatClinicalDate('invalid-date'), '—');
  });

  await t.test('3. formatRelativeTime produces human-readable intervals', () => {
    const now = new Date().toISOString();
    assert.equal(formatRelativeTime(now), 'Just now');

    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    assert.equal(formatRelativeTime(twoHoursAgo), '2h ago');

    assert.equal(formatRelativeTime(null), '—');
  });

  await t.test('4. formatEthiopianPhone standardizes phone numbers', () => {
    assert.equal(formatEthiopianPhone('0911234567'), '+251 91 123 4567');
    assert.equal(formatEthiopianPhone('251911234567'), '+251 91 123 4567');
    assert.equal(formatEthiopianPhone('911234567'), '+251 91 123 4567');
    assert.equal(formatEthiopianPhone(null), '—');
  });

  await t.test('5. formatPatientId and truncateText format patient records', () => {
    assert.equal(formatPatientId('eth-pat-2026-001'), 'ETH-PAT-2026-001');
    assert.equal(truncateText('Tikur Anbessa Specialized Hospital Referral Unit', 20), 'Tikur Anbessa Specia...');
    assert.equal(truncateText('Short text', 20), 'Short text');
  });

  await t.test('6. Triage constants adhere to Ethiopian National Guidelines', () => {
    assert.equal(TRIAGE_PRIORITIES.EMERGENCY.slaMinutes, 15);
    assert.equal(TRIAGE_PRIORITIES.URGENT.slaMinutes, 120);
    assert.equal(TRIAGE_PRIORITIES.PRIORITY.slaMinutes, 360);
    assert.equal(TRIAGE_PRIORITIES.ROUTINE.slaMinutes, 1440);

    const meta = getTriageMeta('urgent');
    assert.equal(meta.key, 'URGENT');
    assert.match(meta.badgeColor, /amber/);
  });

  await t.test('7. Portal metadata defines all four portals with unique ports and roles', () => {
    assert.equal(PORTALS.HEALTH_CENTRE.defaultPort, 5173);
    assert.equal(PORTALS.HOSPITAL.defaultPort, 5174);
    assert.equal(PORTALS.TRANSPORT.defaultPort, 5175);
    assert.equal(PORTALS.ADMINISTRATOR.defaultPort, 5176);

    assert.equal(getPortalById('health-centre').key, 'health_centre');
    assert.equal(getPortalById('hospital').key, 'hospital');
  });

  await t.test('8. Roles and permissions match backend RBAC contract', () => {
    assert.ok(ROLES.SYSTEM_ADMINISTRATOR);
    assert.ok(ROLES.HOSPITAL_TRIAGE_CLINICIAN);
    assert.ok(ROLE_LABELS[ROLES.HOSPITAL_TRIAGE_CLINICIAN]);
    assert.equal(PERMISSIONS.REFERRAL_CREATE, 'referral:create');
    assert.equal(PERMISSIONS.REFERRAL_TRIAGE, 'referral:triage');
  });

  await t.test('9. Storage utility safely gets, sets, and clears values with fallbacks', () => {
    storage.set('test_key', { count: 42 });
    assert.deepEqual(storage.get('test_key'), { count: 42 });
    storage.remove('test_key');
    assert.equal(storage.get('test_key', 'fallback'), 'fallback');
  });
});
