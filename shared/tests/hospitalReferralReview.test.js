import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import { hospitalService } from '../../portals/hospital/src/services/hospitalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 22 Hospital Referral Clinical Review & Decision Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'hospital', 'src');
  const componentsDir = path.join(portalSrc, 'components', 'review');
  const pagesDir = path.join(portalSrc, 'pages');

  await t.test('1. Hospital Referral Review Route Protection & Navigation in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HOSPITAL.allowedRoles'), 'Must restrict access to hospital authorized roles');

    // Review routes
    assert.ok(content.includes('path="referrals/:referralId/review"'), 'Must register /referrals/:referralId/review route');
    assert.ok(content.includes('path="incoming/:referralId/review"'), 'Must register /incoming/:referralId/review route');
    assert.ok(content.includes('ReferralReviewPage'), 'Must reference ReferralReviewPage');

    // Code-splitting and suspense
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load hospital portal views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap routes with Suspense fallback');
  });

  await t.test('2. Hospital Referral Review & Decision API Gateway Contracts in hospitalService.js', async () => {
    assert.ok(hospitalService, 'hospitalService singleton must exist');

    // Check all required decision methods
    assert.equal(typeof hospitalService.acknowledgeReferral, 'function', 'acknowledgeReferral method required');
    assert.equal(typeof hospitalService.acceptReferral, 'function', 'acceptReferral method required');
    assert.equal(typeof hospitalService.rejectReferral, 'function', 'rejectReferral method required');
    assert.equal(typeof hospitalService.requestInformation, 'function', 'requestInformation method required');
    assert.equal(typeof hospitalService.getReferralById, 'function', 'getReferralById method required');
    assert.equal(typeof hospitalService.getReferralTimeline, 'function', 'getReferralTimeline method required');
    assert.equal(typeof hospitalService.getReferralHistory, 'function', 'getReferralHistory method required');
    assert.equal(typeof hospitalService.getReferralDocuments, 'function', 'getReferralDocuments method required');

    // Verify input validation: missing referralId throws Error
    await assert.rejects(
      () => hospitalService.acknowledgeReferral(null),
      /Referral ID required/,
      'acknowledgeReferral must require referralId'
    );
    await assert.rejects(
      () => hospitalService.acceptReferral(null),
      /Referral ID required/,
      'acceptReferral must require referralId'
    );
    await assert.rejects(
      () => hospitalService.rejectReferral(null),
      /Referral ID required/,
      'rejectReferral must require referralId'
    );
    await assert.rejects(
      () => hospitalService.requestInformation(null),
      /Referral ID required/,
      'requestInformation must require referralId'
    );
  });

  await t.test('3. Clinical Review Summary Component Structure & Vitals Alerting (ClinicalReviewSummary.jsx)', () => {
    const filePath = path.join(componentsDir, 'ClinicalReviewSummary.jsx');
    assert.ok(fs.existsSync(filePath), 'ClinicalReviewSummary.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Vitals parameters and evaluation
    assert.ok(content.includes('evaluateVitalSignAlert'), 'Must evaluate physiological vital signs for safety ranges');
    assert.ok(content.includes('Tachycardia') || content.includes('Bradycardia'), 'Must detect cardiac rate anomalies');
    assert.ok(content.includes('Hypoxia'), 'Must detect hypoxic states');
    assert.ok(content.includes('Hypotension') || content.includes('Hypertensive'), 'Must detect abnormal blood pressure');
    assert.ok(content.includes('Pyrexia') || content.includes('Hypothermia'), 'Must detect abnormal body temperature');

    // Demographics and Fayda privacy
    assert.ok(content.includes('patient_fayda_id') || content.includes('faydaId'), 'Must handle Fayda national ID');
    assert.ok(content.includes('••••-••••-'), 'Must mask Fayda national ID to prevent PII exposure');
    assert.ok(content.includes('patient_woreda') || content.includes('patient_kebele'), 'Must present catchment origin');

    // Clinical presentation and attachments
    assert.ok(content.includes('primary_diagnosis'), 'Must display primary clinical diagnosis');
    assert.ok(content.includes('documents'), 'Must render attached diagnostic documents');
  });

  await t.test('4. Review Notes Section & Clinician Attribution (ReviewNotesSection.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReviewNotesSection.jsx');
    assert.ok(fs.existsSync(filePath), 'ReviewNotesSection.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Clinician attribution from AuthContext
    assert.ok(content.includes('useAuth'), 'Must retrieve reviewing clinician context via useAuth');
    assert.ok(content.includes('clinicianName') || content.includes('clinicianRole'), 'Must attribute notes to examining clinician');

    // Triage verification checklist
    assert.ok(content.includes('acuityVerified'), 'Must verify acuity & severity');
    assert.ok(content.includes('specialtyMatches'), 'Must verify specialty alignment');
    assert.ok(content.includes('vitalsStabilized'), 'Must verify patient transfer stabilization');
    assert.ok(content.includes('diagnosticsSufficient'), 'Must verify diagnostic adequacy');

    // Internal vs External distinction
    assert.ok(content.includes('Internal') || content.includes('Confidential'), 'Must emphasize internal hospital confidentiality of notes');
  });

  await t.test('5. Referral Acceptance Workflow & Bed Allocation (ReferralAcceptModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReferralAcceptModal.jsx');
    assert.ok(fs.existsSync(filePath), 'ReferralAcceptModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Ward/department allocation
    assert.ok(content.includes('allocated_ward_department'), 'Must capture allocated ward or department');
    assert.ok(content.includes('WARD_OPTIONS') || content.includes('Inpatient'), 'Must provide standard hospital ward options');

    // Bed classification
    assert.ok(content.includes('assigned_bed_type'), 'Must capture assigned bed type');
    assert.ok(content.includes('STANDARD'), 'Must support STANDARD bed type');
    assert.ok(content.includes('ICU'), 'Must support ICU critical care bed type');
    assert.ok(content.includes('ISOLATION'), 'Must support ISOLATION bed type');
    assert.ok(content.includes('EMERGENCY_OBSERVATION'), 'Must support EMERGENCY_OBSERVATION bed type');

    // Submission and duplicate prevention
    assert.ok(content.includes('hospitalService.acceptReferral'), 'Must invoke hospitalService.acceptReferral');
    assert.ok(content.includes('submitting'), 'Must prevent double submissions during pending request');
  });

  await t.test('6. Referral Rejection Workflow & Rejection Taxonomy (ReferralRejectModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReferralRejectModal.jsx');
    assert.ok(fs.existsSync(filePath), 'ReferralRejectModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Mandatory rejection reason validation (>= 5 chars)
    assert.ok(content.includes('.length < 5') || content.includes('length >= 5'), 'Must enforce minimum 5-character justification');
    assert.ok(content.includes('reasonText') || content.includes('reason'), 'Must capture clinical rejection rationale');

    // Standardized rejection reason codes matching backend validator
    assert.ok(content.includes('CAPACITY_FULL'), 'Must support CAPACITY_FULL rejection code');
    assert.ok(content.includes('SPECIALIST_UNAVAILABLE'), 'Must support SPECIALIST_UNAVAILABLE rejection code');
    assert.ok(content.includes('NO_BEDS_AVAILABLE'), 'Must support NO_BEDS_AVAILABLE rejection code');
    assert.ok(content.includes('INAPPROPRIATE_CLINICAL_TIER'), 'Must support INAPPROPRIATE_CLINICAL_TIER rejection code');
    assert.ok(content.includes('EQUIPMENT_MAINTENANCE'), 'Must support EQUIPMENT_MAINTENANCE rejection code');
    assert.ok(content.includes('OTHER'), 'Must support OTHER rejection code');

    // Alternative facility recommendation
    assert.ok(content.includes('recommended_alternative_facility_id') || content.includes('alternativeFacility'), 'Must capture optional alternative facility recommendation');

    // Submission lock
    assert.ok(content.includes('hospitalService.rejectReferral'), 'Must invoke hospitalService.rejectReferral');
    assert.ok(content.includes('submitting'), 'Must maintain submission lock');
  });

  await t.test('7. Additional Information Request Workflow (ReferralRequestInfoModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReferralRequestInfoModal.jsx');
    assert.ok(fs.existsSync(filePath), 'ReferralRequestInfoModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Notes validation
    assert.ok(content.includes('.length < 5') || content.includes('length >= 5'), 'Must enforce minimum 5-character clarification details');

    // Quick helper tags
    assert.ok(content.includes('QUICK_TAGS') || content.includes('Vital Signs') || content.includes('Imaging'), 'Must offer quick clinical inquiry tags');

    // Submission to service
    assert.ok(content.includes('hospitalService.requestInformation'), 'Must invoke hospitalService.requestInformation');
    assert.ok(content.includes('INFO_REQUESTED'), 'Must indicate transition to INFO_REQUESTED status');
    assert.ok(content.includes('submitting'), 'Must enforce double submission prevention');
  });

  await t.test('8. Referral Decision History & Chronological Audit Trail (ReferralDecisionHistory.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReferralDecisionHistory.jsx');
    assert.ok(fs.existsSync(filePath), 'ReferralDecisionHistory.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Decision outcomes presentation
    assert.ok(content.includes('getDecisionBadge') || content.includes('BadgeIcon'), 'Must render decision outcome badges');
    assert.ok(content.includes('Accepted') || content.includes('ACCEPTED'), 'Must support Accepted determinations');
    assert.ok(content.includes('Rejected') || content.includes('REJECTED'), 'Must support Rejected determinations');
    assert.ok(content.includes('Info Requested') || content.includes('REQUEST_INFO'), 'Must support Info Requested determinations');

    // Clinician ID and timestamp attribution
    assert.ok(content.includes('evaluating_clinician_id') || content.includes('created_at'), 'Must display evaluating clinician attribution and timestamp');

    // Timeline event visualization
    assert.ok(content.includes('timeline') || content.includes('allEvents'), 'Must render chronological referral event timeline');
  });

  await t.test('9. Real-time Telemetry, Live Polling & Review Page Integration (ReferralReviewPage.jsx)', () => {
    const filePath = path.join(pagesDir, 'ReferralReviewPage.jsx');
    assert.ok(fs.existsSync(filePath), 'ReferralReviewPage.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Real-time synchronization
    assert.ok(content.includes('useHospitalRealtime'), 'Must integrate useHospitalRealtime hook for live events');
    assert.ok(content.includes('triggerLiveSync'), 'Must provide manual trigger for synchronization');

    // Triage actions integration
    assert.ok(content.includes('handleAcknowledge'), 'Must support acknowledging incoming referral receipt');
    assert.ok(content.includes('ReferralAcceptModal'), 'Must mount ReferralAcceptModal');
    assert.ok(content.includes('ReferralRejectModal'), 'Must mount ReferralRejectModal');
    assert.ok(content.includes('ReferralRequestInfoModal'), 'Must mount ReferralRequestInfoModal');
    assert.ok(content.includes('ReferralDecisionHistory'), 'Must mount ReferralDecisionHistory');
    assert.ok(content.includes('ClinicalReviewSummary'), 'Must mount ClinicalReviewSummary');

    // High acuity warning
    assert.ok(content.includes('EMERGENCY'), 'Must display high-acuity transfer review warning banner');
  });

  await t.test('10. Security, Tenancy Isolation & Privacy Safeguards', () => {
    const reviewComponents = [
      'ClinicalReviewSummary.jsx',
      'ReviewNotesSection.jsx',
      'ReferralAcceptModal.jsx',
      'ReferralRejectModal.jsx',
      'ReferralRequestInfoModal.jsx',
      'ReferralDecisionHistory.jsx'
    ];

    for (const comp of reviewComponents) {
      const compPath = path.join(componentsDir, comp);
      assert.ok(fs.existsSync(compPath), `Component ${comp} must exist`);
      const text = fs.readFileSync(compPath, 'utf8');

      // No persistent localStorage leakage
      assert.ok(!text.includes('localStorage.setItem'), `${comp} must not persist patient data or decisions into localStorage`);

      // No raw unmasked console logging of PII
      assert.ok(!text.includes('console.log('), `${comp} must not leave stray console.log statements that could leak PII`);
    }

    // Tenancy isolation verification in backend referralService
    const backendServicePath = path.join(rootDir, 'backend', 'src', 'services', 'referralService.js');
    assert.ok(fs.existsSync(backendServicePath), 'Backend referralService must exist');
    const backendService = fs.readFileSync(backendServicePath, 'utf8');

    assert.ok(
      backendService.includes('destination_facility_id !== userFacilityId'),
      'Backend referralService must enforce facility tenancy isolation on hospital decisions'
    );
  });
});
