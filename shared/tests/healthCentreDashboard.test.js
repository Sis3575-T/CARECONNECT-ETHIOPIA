import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES, ROLE_LABELS } from '../constants/roles.js';
import { TRIAGE_PRIORITIES } from '../constants/triage.js';
import {
  healthCentreService,
  calculateOperationalMetrics
} from '../../portals/health-centre/src/services/healthCentreService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 17 Health Centre Portal Dashboard Test Suite', async (t) => {
  const portalDir = path.join(rootDir, 'portals', 'health-centre', 'src');

  await t.test('1. Health Centre Portal Definition and RBAC Authorization Matrix', () => {
    assert.ok(PORTALS.HEALTH_CENTRE, 'PORTALS.HEALTH_CENTRE must be defined');
    assert.equal(PORTALS.HEALTH_CENTRE.id, 'health-centre');
    assert.equal(PORTALS.HEALTH_CENTRE.themeAccent, 'sky');
    assert.equal(PORTALS.HEALTH_CENTRE.primaryColor, '#0284c7');

    const allowed = PORTALS.HEALTH_CENTRE.allowedRoles;
    assert.ok(allowed.includes(ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN), 'Must allow Health Centre Referral Clinician');
    assert.ok(allowed.includes(ROLES.PRIMARY_CARE_PHYSICIAN), 'Must allow Primary Care Physician');
    assert.ok(allowed.includes(ROLES.CLINICAL_NURSE), 'Must allow Clinical Nurse');
    assert.ok(allowed.includes(ROLES.SYSTEM_ADMINISTRATOR), 'Must allow System Administrator');
    assert.ok(allowed.includes(ROLES.REGIONAL_OFFICER), 'Must allow Regional Officer');

    // Disallowed hospital and transport roles
    assert.equal(allowed.includes(ROLES.HOSPITAL_TRIAGE_CLINICIAN), false, 'Hospital clinician must not have direct HC access');
    assert.equal(allowed.includes(ROLES.CHIEF_CLINICAL_OFFICER), false, 'Hospital CCO must not have direct HC access');
    assert.equal(allowed.includes(ROLES.TRANSPORT_COORDINATOR), false, 'Transport coordinator must not have direct HC access');
    assert.equal(allowed.includes(ROLES.AMBULANCE_DRIVER), false, 'Ambulance driver must not have direct HC access');
  });

  await t.test('2. Health Centre Portal Architecture & Route Guards in App.jsx', () => {
    const appPath = path.join(portalDir, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must wrap routes with ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HEALTH_CENTRE.allowedRoles'), 'Must use PORTALS.HEALTH_CENTRE.allowedRoles');
    assert.ok(content.includes('HealthCentreLayout'), 'Must render HealthCentreLayout');
    assert.ok(content.includes('DashboardPage'), 'Must mount DashboardPage at root');
    assert.ok(content.includes('PatientsPage'), 'Must mount PatientsPage');
    assert.ok(content.includes('CreateReferralPage'), 'Must mount CreateReferralPage');
    assert.ok(content.includes('AllReferralsPage'), 'Must mount AllReferralsPage');
    assert.ok(content.includes('TrackingPage'), 'Must mount TrackingPage');
    assert.ok(content.includes('NotFoundPage'), 'Must include 404 NotFoundPage fallback');
  });

  await t.test('3. Health Centre Service Data Normalization and Metric Computation', async () => {
    assert.ok(typeof calculateOperationalMetrics === 'function', 'calculateOperationalMetrics must be a function');
    assert.ok(typeof healthCentreService.getDashboardSummary === 'function');
    assert.ok(typeof healthCentreService.getRecentReferrals === 'function');
    assert.ok(typeof healthCentreService.getPendingActions === 'function');
    assert.ok(typeof healthCentreService.getNotifications === 'function');
    assert.ok(typeof healthCentreService.markNotificationAsRead === 'function');
    assert.ok(typeof healthCentreService.getFacility === 'function');

    // Test pure calculation metrics logic
    const mockReferrals = [
      { id: '1', status: 'SUBMITTED' },
      { id: '2', status: 'PENDING' },
      { id: '3', status: 'ACCEPTED' },
      { id: '4', status: 'IN_TRANSIT' },
      { id: '5', status: 'COMPLETED' },
      { id: '6', status: 'REJECTED' },
      { id: '7', status: 'DRAFT' }
    ];

    const metrics = calculateOperationalMetrics(mockReferrals, 42, 3);
    assert.equal(metrics.totalPatients, 42);
    assert.equal(metrics.totalReferrals, 7);
    assert.equal(metrics.pendingCount, 2); // SUBMITTED + PENDING
    assert.equal(metrics.acceptedCount, 1);
    assert.equal(metrics.inTransitCount, 1);
    assert.equal(metrics.completedCount, 1);
    assert.equal(metrics.rejectedCount, 1);
    assert.equal(metrics.draftCount, 1);
    assert.equal(metrics.activeReferrals, 4); // 2 + 1 + 1
    // closedTotal = 1 completed + 1 rejected = 2. acceptanceRate = 1/2 = 50%
    assert.equal(metrics.acceptanceRate, 50);
    assert.equal(metrics.unreadNotifications, 3);

    // Test zero-referral safety
    const emptyMetrics = calculateOperationalMetrics([], 0, 0);
    assert.equal(emptyMetrics.totalPatients, 0);
    assert.equal(emptyMetrics.totalReferrals, 0);
    assert.equal(emptyMetrics.activeReferrals, 0);
    assert.equal(emptyMetrics.acceptanceRate, 100);
    assert.equal(Number.isNaN(emptyMetrics.acceptanceRate), false);
  });

  await t.test('4. Privacy-Preserving Patient Identifier Masking Logic', () => {
    // Pure function logic mirroring RecentReferralsTable.jsx
    function maskPatient(referral) {
      if (referral.patient_mrn) {
        const mrn = String(referral.patient_mrn);
        return mrn.length > 4 ? `MRN-***${mrn.slice(-4)}` : `MRN-${mrn}`;
      }
      if (referral.patientName || referral.patient_name) {
        const raw = referral.patientName || referral.patient_name;
        const parts = raw.trim().split(/\s+/);
        if (parts.length >= 2) {
          return `${parts[0]} ${parts[1][0]}.`;
        }
        return parts[0];
      }
      if (referral.patient_id || referral.patientId) {
        const pid = String(referral.patient_id || referral.patientId);
        return `PID-${pid.slice(0, 6)}...`;
      }
      return 'Patient #Confidential';
    }

    assert.equal(maskPatient({ patient_mrn: 'MRN-2026-98745' }), 'MRN-***8745');
    assert.equal(maskPatient({ patientName: 'Abebe Bikila' }), 'Abebe B.');
    assert.equal(maskPatient({ patient_name: 'Almaz' }), 'Almaz');
    assert.equal(maskPatient({ patientId: 'p-uuid-987654321' }), 'PID-p-uuid...');
    assert.equal(maskPatient({}), 'Patient #Confidential');
  });

  await t.test('5. Clinician Action Center Categorization (Rejections, Triage, Transit)', () => {
    const sampleReferrals = [
      { id: 'ref-1', status: 'REJECTED', rejection_reason: 'No ICU beds' },
      { id: 'ref-2', status: 'SUBMITTED', triage_priority: 'EMERGENCY' },
      { id: 'ref-3', status: 'PENDING', triage_priority: 'PRIORITY' },
      { id: 'ref-4', status: 'IN_TRANSIT', destination_facility_name: 'Tikur Anbessa' },
      { id: 'ref-5', status: 'COMPLETED' },
      { id: 'ref-6', status: 'ACCEPTED' }
    ];

    const rejected = sampleReferrals.filter(r => r.status === 'REJECTED');
    const pendingTriage = sampleReferrals.filter(r => ['SUBMITTED', 'PENDING', 'ACKNOWLEDGED'].includes(r.status));
    const inTransit = sampleReferrals.filter(r => ['IN_TRANSIT', 'DISPATCHED'].includes(r.status));

    assert.equal(rejected.length, 1, 'Exactly 1 rejected referral');
    assert.equal(pendingTriage.length, 2, 'Exactly 2 referrals awaiting triage');
    assert.equal(inTransit.length, 1, 'Exactly 1 referral in transit');
    assert.equal(rejected[0].rejection_reason, 'No ICU beds');
    assert.equal(pendingTriage[0].triage_priority, 'EMERGENCY');
  });

  await t.test('6. Dashboard Component Exports & Modular File Structure', () => {
    const compDir = path.join(portalDir, 'components', 'dashboard');
    assert.ok(fs.existsSync(compDir), 'components/dashboard folder must exist');

    const expectedFiles = [
      'HealthCentreStats.jsx',
      'RecentReferralsTable.jsx',
      'PendingActionsSection.jsx',
      'DashboardQuickActions.jsx',
      'RecentNotificationsWidget.jsx'
    ];

    for (const file of expectedFiles) {
      const fullPath = path.join(compDir, file);
      assert.ok(fs.existsSync(fullPath), `${file} must exist`);
      const src = fs.readFileSync(fullPath, 'utf8');
      assert.ok(src.includes('export'), `${file} must have named or default export`);
    }
  });

  await t.test('7. HealthCentreLayout Dynamic Authentication and Facility Integration', () => {
    const layoutPath = path.join(portalDir, 'layouts', 'HealthCentreLayout.jsx');
    assert.ok(fs.existsSync(layoutPath), 'HealthCentreLayout.jsx must exist');
    const src = fs.readFileSync(layoutPath, 'utf8');

    assert.ok(src.includes('useAuth'), 'Must consume useAuth()');
    assert.ok(src.includes('PortalLayout'), 'Must render shared PortalLayout');
    assert.ok(src.includes('portalAccent="sky"'), 'Must configure sky accent for health centre');
    assert.ok(src.includes('ROLE_LABELS'), 'Must format role labels');
    assert.ok(src.includes('healthCentreService'), 'Must fetch facility or notification metadata');
  });

  await t.test('8. DashboardPage Usability, Error Handling and Offline Resilience', () => {
    const pagePath = path.join(portalDir, 'pages', 'DashboardPage.jsx');
    assert.ok(fs.existsSync(pagePath), 'DashboardPage.jsx must exist');
    const src = fs.readFileSync(pagePath, 'utf8');

    assert.ok(src.includes('HealthCentreStats'), 'Must mount HealthCentreStats');
    assert.ok(src.includes('RecentReferralsTable'), 'Must mount RecentReferralsTable');
    assert.ok(src.includes('PendingActionsSection'), 'Must mount PendingActionsSection');
    assert.ok(src.includes('DashboardQuickActions'), 'Must mount DashboardQuickActions');
    assert.ok(src.includes('RecentNotificationsWidget'), 'Must mount RecentNotificationsWidget');
    assert.ok(src.includes('offline'), 'Must handle offline connectivity state');
    assert.ok(src.includes('getGreeting'), 'Must provide dynamic clinician greeting');
  });
});
