import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import { referralTrackingService } from '../../portals/health-centre/src/services/referralTrackingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 20 Health Centre Referral Tracking Test Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'health-centre', 'src');
  const referralsDir = path.join(portalSrc, 'components', 'referrals');

  await t.test('1. Referral Tracking Route Structure & Security in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HEALTH_CENTRE.allowedRoles'), 'Must restrict access to health centre authorized roles');

    // Tracking routes hierarchy
    assert.ok(content.includes('path="referrals"'), 'Must mount /referrals primary tracking list');
    assert.ok(content.includes('path="referrals/:referralId"'), 'Must mount /referrals/:referralId detail view');
    assert.ok(content.includes('path="tracking/:referralId"'), 'Must mount /tracking/:referralId alias');

    // Code-splitting
    assert.ok(content.includes('ReferralDetailPage'), 'App.jsx must import ReferralDetailPage');
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load referral tracking views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap routes with Suspense');
  });

  await t.test('2. Referral Tracking Service Gateway Contracts', () => {
    assert.ok(referralTrackingService, 'referralTrackingService singleton must exist');
    assert.equal(typeof referralTrackingService.getReferrals, 'function', 'getReferrals method required');
    assert.equal(typeof referralTrackingService.getReferralById, 'function', 'getReferralById method required');
    assert.equal(typeof referralTrackingService.getReferralTimeline, 'function', 'getReferralTimeline method required');
    assert.equal(typeof referralTrackingService.getReferralHistory, 'function', 'getReferralHistory method required');
    assert.equal(typeof referralTrackingService.getReferralStatus, 'function', 'getReferralStatus method required');
    assert.equal(typeof referralTrackingService.trackByReference, 'function', 'trackByReference method required');
    assert.equal(typeof referralTrackingService.getInformationRequests, 'function', 'getInformationRequests method required');
    assert.equal(typeof referralTrackingService.respondToInformationRequest, 'function', 'respondToInformationRequest method required');
    assert.equal(typeof referralTrackingService.getFollowUps, 'function', 'getFollowUps method required');
    assert.equal(typeof referralTrackingService.recordFollowUp, 'function', 'recordFollowUp method required');
    assert.equal(typeof referralTrackingService.getEscalations, 'function', 'getEscalations method required');
    assert.equal(typeof referralTrackingService.createEscalation, 'function', 'createEscalation method required');
    assert.equal(typeof referralTrackingService.getDelays, 'function', 'getDelays method required');
    assert.equal(typeof referralTrackingService.getMissedEvents, 'function', 'getMissedEvents method required');
  });

  await t.test('3. Referral Tracking Workspace & Table UI (AllReferralsPage & ReferralTrackingTable)', () => {
    const listPagePath = path.join(portalSrc, 'pages', 'AllReferralsPage.jsx');
    const tablePath = path.join(referralsDir, 'ReferralTrackingTable.jsx');
    assert.ok(fs.existsSync(listPagePath), 'AllReferralsPage.jsx must exist');
    assert.ok(fs.existsSync(tablePath), 'ReferralTrackingTable.jsx must exist');

    const pageContent = fs.readFileSync(listPagePath, 'utf8');
    assert.ok(pageContent.includes('referralTrackingService.getReferrals'), 'Must fetch referrals from service');
    assert.ok(pageContent.includes('STATUS_FILTER_OPTIONS'), 'Must support status filters');
    assert.ok(pageContent.includes('PRIORITY_FILTER_OPTIONS'), 'Must support urgency filters');
    assert.ok(pageContent.includes('handleExportCSV'), 'Must support CSV export');
    assert.ok(pageContent.includes('ReferralTrackingSkeleton'), 'Must display loading skeleton');
    assert.ok(pageContent.includes('ReferralTrackingErrorState'), 'Must handle query errors');

    const tableContent = fs.readFileSync(tablePath, 'utf8');
    assert.ok(tableContent.includes('ReferralStatusBadge'), 'Table must render status badge');
    assert.ok(tableContent.includes('ReferralPriorityBadge'), 'Table must render priority badge');
    assert.ok(tableContent.includes('formatClinicalDate'), 'Table must format clinical timestamps');
    assert.ok(tableContent.includes('formatRelativeTime'), 'Table must format relative time');
    assert.ok(tableContent.includes('/patients/'), 'Table must provide link to patient profile');
  });

  await t.test('4. Referral Detail View & Clinical Observation Structure (ReferralDetailPage)', () => {
    const detailPagePath = path.join(portalSrc, 'pages', 'ReferralDetailPage.jsx');
    assert.ok(fs.existsSync(detailPagePath), 'ReferralDetailPage.jsx must exist');
    const content = fs.readFileSync(detailPagePath, 'utf8');

    assert.ok(content.includes('referralTrackingService.getReferralById'), 'Must query referral details');
    assert.ok(content.includes('patient_name') || content.includes('patientName'), 'Must render patient demographic summary');
    assert.ok(content.includes('primary_diagnosis'), 'Must render primary diagnosis');
    assert.ok(content.includes('clinical_summary'), 'Must render clinical narrative');
    assert.ok(content.includes('vitals_blood_pressure'), 'Must render vital signs table');
    assert.ok(content.includes('transport_required'), 'Must render transport requirement');
    assert.ok(content.includes('destination_facility_name'), 'Must render destination hospital');
  });

  await t.test('5. Status Timeline & Verifiable Event Rendering (ReferralStatusTimeline)', () => {
    const timelinePath = path.join(referralsDir, 'ReferralStatusTimeline.jsx');
    assert.ok(fs.existsSync(timelinePath), 'ReferralStatusTimeline.jsx must exist');
    const content = fs.readFileSync(timelinePath, 'utf8');

    assert.ok(content.includes('STATUS_TRANSITION'), 'Must handle status transitions');
    assert.ok(content.includes('DECISION'), 'Must handle hospital triage decisions');
    assert.ok(content.includes('INFORMATION_REQUEST'), 'Must handle info requests');
    assert.ok(content.includes('FOLLOW_UP'), 'Must handle follow-up entries');
    assert.ok(content.includes('sort'), 'Must order events chronologically');
    assert.ok(content.includes('formatClinicalDate'), 'Must format timestamps accurately');
    assert.ok(!content.includes('Math.random()'), 'Must not generate fake events');
  });

  await t.test('6. Hospital Response Visibility & Decision Presentation (HospitalResponseCard)', () => {
    const responsePath = path.join(referralsDir, 'HospitalResponseCard.jsx');
    assert.ok(fs.existsSync(responsePath), 'HospitalResponseCard.jsx must exist');
    const content = fs.readFileSync(responsePath, 'utf8');

    // ACCEPTED state
    assert.ok(content.includes('ACCEPTED'), 'Must handle ACCEPTED state');
    assert.ok(content.includes('assigned_department'), 'Must display assigned department');
    assert.ok(content.includes('decision_notes'), 'Must display admitting instructions');

    // REJECTED state
    assert.ok(content.includes('REJECTED'), 'Must handle REJECTED state');
    assert.ok(content.includes('rejection_reason'), 'Must display actual rejection reason');
    assert.ok(content.includes('Initiate Alternate Referral'), 'Must offer action to create alternative referral');

    // INFO_REQUESTED state
    assert.ok(content.includes('INFO_REQUESTED'), 'Must handle INFO_REQUESTED state');
    assert.ok(content.includes('Action Required'), 'Must highlight required action');

    // Transparent logging - no hidden states
    assert.ok(!content.includes('display: none'), 'Rejection status must never be hidden');
  });

  await t.test('7. Information Request & Response Workflow (ReferralInfoRequestsSection)', () => {
    const infoSectionPath = path.join(referralsDir, 'ReferralInfoRequestsSection.jsx');
    assert.ok(fs.existsSync(infoSectionPath), 'ReferralInfoRequestsSection.jsx must exist');
    const content = fs.readFileSync(infoSectionPath, 'utf8');

    assert.ok(content.includes('getInformationRequests'), 'Must query information requests');
    assert.ok(content.includes('respondToInformationRequest'), 'Must call respond endpoint');
    assert.ok(content.includes('response_notes'), 'Must submit response_notes');
    assert.ok(content.includes('length < 5'), 'Must enforce minimum 5-character response validation');
    assert.ok(content.includes('uploadReferralDocument'), 'Must support document upload with response');
    assert.ok(content.includes('submitting'), 'Must prevent duplicate submission');
  });

  await t.test('8. Follow-up Interaction & Operational Escalation Workspace (ReferralFollowUpSection)', () => {
    const followUpPath = path.join(referralsDir, 'ReferralFollowUpSection.jsx');
    assert.ok(fs.existsSync(followUpPath), 'ReferralFollowUpSection.jsx must exist');
    const content = fs.readFileSync(followUpPath, 'utf8');

    // Communication channels
    assert.ok(content.includes('PHONE_CALL'), 'Must support PHONE_CALL channel');
    assert.ok(content.includes('SMS'), 'Must support SMS channel');
    assert.ok(content.includes('EMAIL'), 'Must support EMAIL channel');
    assert.ok(content.includes('IN_PLATFORM'), 'Must support IN_PLATFORM channel');

    // Validation
    assert.ok(content.includes('recordFollowUp'), 'Must call recordFollowUp service method');
    assert.ok(content.includes('outcome'), 'Must require follow-up outcome');
    assert.ok(content.includes('reason_or_notes') || content.includes('notes'), 'Must require notes');

    // Operational escalation
    assert.ok(content.includes('getEscalations'), 'Must query operational escalations');
    assert.ok(content.includes('does not replace or modify clinical'), 'Must clarify administrative SLA nature vs clinical triage');
  });

  await t.test('9. Real-time Telemetry & Fallback Polling Hook (useReferralRealtimeTracking)', () => {
    const hookPath = path.join(portalSrc, 'hooks', 'useReferralRealtimeTracking.js');
    assert.ok(fs.existsSync(hookPath), 'useReferralRealtimeTracking.js must exist');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert.ok(content.includes('getMissedEvents'), 'Must query missed events upon sync');
    assert.ok(content.includes('seenEventIdsRef') || content.includes('seenEventIds'), 'Must deduplicate events');
    assert.ok(content.includes('setInterval'), 'Must configure polling interval fallback');
    assert.ok(content.includes('clearInterval'), 'Must clean up timer on unmount');
    assert.ok(content.includes('isLiveConnected'), 'Must expose connection state');
    assert.ok(content.includes('triggerSync'), 'Must expose manual refresh trigger');
  });

  await t.test('10. Privacy, Security & Tenancy Isolation Verification', () => {
    const detailPath = path.join(portalSrc, 'pages', 'ReferralDetailPage.jsx');
    const hookPath = path.join(portalSrc, 'hooks', 'useReferralRealtimeTracking.js');
    const detailContent = fs.readFileSync(detailPath, 'utf8');
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    // No persistent storage of referral data
    assert.ok(!detailContent.includes('localStorage.setItem'), 'Must NEVER store referral tracking data in localStorage');
    assert.ok(!hookContent.includes('localStorage.setItem'), 'Must NEVER store real-time event payloads in localStorage');

    // No sensitive clinical PII logged to console
    assert.ok(!detailContent.includes('console.log(referral'), 'Must NEVER log patient referral records to console');
    assert.ok(!hookContent.includes('console.log(ev'), 'Must NEVER log event payloads to console');
  });
});
