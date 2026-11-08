import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import {
  hospitalService,
  calculateHospitalOperationalMetrics
} from '../../portals/hospital/src/services/hospitalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 21 Hospital Portal Dashboard & Referral Inbox Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'hospital', 'src');
  const componentsDir = path.join(portalSrc, 'components');
  const pagesDir = path.join(portalSrc, 'pages');

  await t.test('1. Hospital Route Protection and RBAC Guards in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HOSPITAL.allowedRoles'), 'Must restrict access to hospital authorized roles');

    // Expected hospital routes
    assert.ok(content.includes('path="incoming"'), 'Must mount /incoming referral queue');
    assert.ok(content.includes('path="referrals/:referralId"'), 'Must mount /referrals/:referralId detail view');
    assert.ok(content.includes('path="incoming/:referralId"'), 'Must mount /incoming/:referralId alias');
    assert.ok(content.includes('path="pending"'), 'Must mount /pending work queue');

    // Code-splitting and suspense
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load hospital portal views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap routes with Suspense fallback');
  });

  await t.test('2. Hospital API Service Gateway Contracts (hospitalService.js)', () => {
    assert.ok(hospitalService, 'hospitalService singleton must exist');
    assert.equal(typeof hospitalService.getHospitalProfile, 'function', 'getHospitalProfile method required');
    assert.equal(typeof hospitalService.getDashboardSummary, 'function', 'getDashboardSummary method required');
    assert.equal(typeof hospitalService.getIncomingReferrals, 'function', 'getIncomingReferrals method required');
    assert.equal(typeof hospitalService.getReferralById, 'function', 'getReferralById method required');
    assert.equal(typeof hospitalService.getReferralTimeline, 'function', 'getReferralTimeline method required');
    assert.equal(typeof hospitalService.getReferralHistory, 'function', 'getReferralHistory method required');
    assert.equal(typeof hospitalService.getReferralDocuments, 'function', 'getReferralDocuments method required');
    assert.equal(typeof hospitalService.getInformationRequests, 'function', 'getInformationRequests method required');
    assert.equal(typeof hospitalService.getPendingActions, 'function', 'getPendingActions method required');
    assert.equal(typeof hospitalService.getNotifications, 'function', 'getNotifications method required');
    assert.equal(typeof hospitalService.getMissedEvents, 'function', 'getMissedEvents method required');
  });

  await t.test('3. HospitalLayout Server-Authoritative Context & Navigation', () => {
    const layoutPath = path.join(portalSrc, 'layouts', 'HospitalLayout.jsx');
    assert.ok(fs.existsSync(layoutPath), 'HospitalLayout.jsx must exist');
    const content = fs.readFileSync(layoutPath, 'utf8');

    // Authenticated context
    assert.ok(content.includes('useAuth()'), 'Layout must obtain server-authoritative session via useAuth()');
    assert.ok(!content.includes("firstName: 'Dr. Fitsum'"), 'Must not contain hardcoded clinician name');
    assert.ok(content.includes('hospitalService.getHospitalProfile'), 'Must query facility profile from service');
    assert.ok(content.includes('hospitalService.getDashboardSummary'), 'Must query live metrics for badges');

    // Navigation items
    assert.ok(content.includes('/incoming'), 'Nav items must include Incoming Referrals');
    assert.ok(content.includes('/pending'), 'Nav items must include Pending Triage');
    assert.ok(content.includes('PortalLayout'), 'Must render shared PortalLayout');
  });

  await t.test('4. Hospital Dashboard Operational Metrics & Calculation (calculateHospitalOperationalMetrics)', () => {
    const sampleReferrals = [
      { id: 'ref-1', status: 'SUBMITTED', priority: 'EMERGENCY' },
      { id: 'ref-2', status: 'PENDING', priority: 'URGENT' },
      { id: 'ref-3', status: 'IN_REVIEW', priority: 'ROUTINE' },
      { id: 'ref-4', status: 'ACCEPTED', priority: 'ROUTINE' },
      { id: 'ref-5', status: 'REJECTED', priority: 'ROUTINE' },
      { id: 'ref-6', status: 'INFO_REQUESTED', priority: 'URGENT' },
      { id: 'ref-7', status: 'ARRIVED', priority: 'ROUTINE' },
      { id: 'ref-8', status: 'COMPLETED', priority: 'ROUTINE' }
    ];

    const metrics = calculateHospitalOperationalMetrics(sampleReferrals, 5);

    assert.equal(metrics.totalIncoming, 8, 'Total incoming referrals should equal 8');
    assert.equal(metrics.pendingTriageCount, 2, 'Pending triage should count SUBMITTED and PENDING (2)');
    assert.equal(metrics.inReviewCount, 1, 'In review should count IN_REVIEW (1)');
    assert.equal(metrics.acceptedCount, 1, 'Accepted count should equal 1');
    assert.equal(metrics.rejectedCount, 1, 'Rejected count should equal 1');
    assert.equal(metrics.infoRequestedCount, 1, 'Info requested count should equal 1');
    assert.equal(metrics.emergencyCount, 1, 'Emergency count should equal 1');
    assert.equal(metrics.urgentCount, 2, 'Urgent count should equal 2');
    assert.equal(metrics.unreadNotifications, 5, 'Unread notifications should equal 5');
    assert.equal(metrics.acceptanceRate, 50, 'Acceptance rate of decided cases (1 accepted / 2 decided) should equal 50%');
  });

  await t.test('5. Incoming Referrals Inbox, Filtering, Search & Pagination (IncomingReferralsPage)', () => {
    const inboxPath = path.join(pagesDir, 'IncomingReferralsPage.jsx');
    const tablePath = path.join(componentsDir, 'HospitalReferralTable.jsx');
    assert.ok(fs.existsSync(inboxPath), 'IncomingReferralsPage.jsx must exist');
    assert.ok(fs.existsSync(tablePath), 'HospitalReferralTable.jsx must exist');

    const inboxContent = fs.readFileSync(inboxPath, 'utf8');
    assert.ok(inboxContent.includes('hospitalService.getIncomingReferrals'), 'Must call getIncomingReferrals API');
    assert.ok(inboxContent.includes('STATUS_FILTER_OPTIONS'), 'Must support status filters');
    assert.ok(inboxContent.includes('PRIORITY_FILTER_OPTIONS'), 'Must support priority filters');
    assert.ok(inboxContent.includes('actionRequiredOnly'), 'Must support Action Required toggle');
    assert.ok(inboxContent.includes('HospitalReferralTable'), 'Must render HospitalReferralTable');
    assert.ok(inboxContent.includes('HospitalDashboardSkeleton'), 'Must support skeleton loading state');
    assert.ok(inboxContent.includes('HospitalErrorState'), 'Must handle fetch errors safely');

    const tableContent = fs.readFileSync(tablePath, 'utf8');
    assert.ok(tableContent.includes('HospitalStatusBadge'), 'Table must render status badge');
    assert.ok(tableContent.includes('HospitalPriorityBadge'), 'Table must render priority badge');
    assert.ok(tableContent.includes('formatRelativeTime'), 'Table must format elapsed time');
    assert.ok(tableContent.includes('/referrals/'), 'Table must link to referral detail');
  });

  await t.test('6. Incoming Referral Detail View & Clinical Observations (ReferralDetailPage)', () => {
    const detailPath = path.join(pagesDir, 'ReferralDetailPage.jsx');
    assert.ok(fs.existsSync(detailPath), 'ReferralDetailPage.jsx must exist');
    const content = fs.readFileSync(detailPath, 'utf8');

    assert.ok(content.includes('hospitalService.getReferralById'), 'Must query referral details');
    assert.ok(content.includes('patient_name') || content.includes('patientName'), 'Must render patient demographic info');
    assert.ok(content.includes('primary_diagnosis'), 'Must render primary clinical diagnosis');
    assert.ok(content.includes('clinical_summary') || content.includes('presenting_complaint'), 'Must render clinical narrative');
    assert.ok(content.includes('vitals_blood_pressure') || content.includes('blood_pressure'), 'Must render Blood Pressure');
    assert.ok(content.includes('vitals_heart_rate') || content.includes('heart_rate'), 'Must render Heart Rate');
    assert.ok(content.includes('vitals_oxygen_saturation') || content.includes('oxygen_saturation'), 'Must render Oxygen Saturation (SpO2)');
    assert.ok(content.includes('transport_required'), 'Must display transport requirements');
    assert.ok(content.includes('/incoming'), 'Must provide navigation back to incoming queue');
  });

  await t.test('7. Supporting Diagnostic Documents Handling & Attachment Display', () => {
    const detailPath = path.join(pagesDir, 'ReferralDetailPage.jsx');
    const content = fs.readFileSync(detailPath, 'utf8');

    assert.ok(content.includes('hospitalService.getReferralDocuments'), 'Must query attached documents');
    assert.ok(content.includes('documents.length'), 'Must render attached documents count');
    assert.ok(content.includes('file_name') || content.includes('name'), 'Must render filename');
    assert.ok(content.includes('document_type') || content.includes('category'), 'Must render document category badge');
    assert.ok(content.includes('Download') || content.includes('Preview'), 'Must support document preview/download');
  });

  await t.test('8. Hospital Pending Actions Workspace & Operational SLA Tracking (PendingReferralsPage)', () => {
    const pendingPath = path.join(pagesDir, 'PendingReferralsPage.jsx');
    assert.ok(fs.existsSync(pendingPath), 'PendingReferralsPage.jsx must exist');
    const content = fs.readFileSync(pendingPath, 'utf8');

    assert.ok(content.includes('hospitalService.getPendingActions'), 'Must query pending actions queue');
    assert.ok(content.includes('ACTION_TABS'), 'Must support action category tabs');
    assert.ok(content.includes('NEW_INCOMING'), 'Must support new incoming category');
    assert.ok(content.includes('PENDING_TRIAGE'), 'Must support pending triage category');
    assert.ok(content.includes('INFO_REQUESTED'), 'Must support info requested category');
    assert.ok(content.includes('does not replace or modify clinical triage priority'), 'Must explicitly clarify operational SLA vs clinical triage priority');
    assert.ok(content.includes('/referrals/'), 'Must provide link to review referral');
  });

  await t.test('9. Real-Time Telemetry & Fallback Polling Hook (useHospitalRealtime)', () => {
    const hookPath = path.join(portalSrc, 'hooks', 'useHospitalRealtime.js');
    assert.ok(fs.existsSync(hookPath), 'useHospitalRealtime.js must exist');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert.ok(content.includes('hospitalService.getMissedEvents'), 'Must query missed events from backend');
    assert.ok(content.includes('seenEventIdsRef'), 'Must deduplicate events with Set');
    assert.ok(content.includes('setInterval'), 'Must configure polling fallback timer');
    assert.ok(content.includes('clearInterval'), 'Must clean up polling timer on unmount');
    assert.ok(content.includes('isLiveConnected'), 'Must expose connection status');
    assert.ok(content.includes('triggerSync'), 'Must expose manual refresh trigger');
  });

  await t.test('10. Security, Tenancy Isolation & Privacy Safeguards', () => {
    const detailPath = path.join(pagesDir, 'ReferralDetailPage.jsx');
    const hookPath = path.join(portalSrc, 'hooks', 'useHospitalRealtime.js');
    const detailContent = fs.readFileSync(detailPath, 'utf8');
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // Zero persistent storage of referral data
    assert.ok(!detailContent.includes('localStorage.setItem'), 'Must NEVER store hospital referral data in localStorage');
    assert.ok(!hookContent.includes('localStorage.setItem'), 'Must NEVER cache real-time event payloads in localStorage');

    // Zero PII logged to console
    assert.ok(!detailContent.includes('console.log(referral'), 'Must NEVER log patient referral records to console');
    assert.ok(!hookContent.includes('console.log(ev'), 'Must NEVER log real-time event payloads to console');
  });
});
