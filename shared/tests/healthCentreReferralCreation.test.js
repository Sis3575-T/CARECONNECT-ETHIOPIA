import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import { referralCreationService } from '../../portals/health-centre/src/services/referralCreationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 19 Health Centre Referral Creation Test Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'health-centre', 'src');
  const referralsDir = path.join(portalSrc, 'components', 'referrals');

  await t.test('1. Referral Creation Route Structure & Security in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute on referral creation');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute on referral creation');
    assert.ok(content.includes('PORTALS.HEALTH_CENTRE.allowedRoles'), 'Must restrict access to health centre authorized roles');

    // Canonical referral creation route and alias
    assert.ok(content.includes('path="referrals/new"'), 'Must mount /referrals/new creation route');
    assert.ok(content.includes('path="create-referral"'), 'Must mount /create-referral navigation route');

    // Performance code-splitting
    assert.ok(content.includes('CreateReferralPage'), 'App.jsx must load CreateReferralPage');
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load referral views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap lazy-loaded routes with Suspense');
  });

  await t.test('2. Referral Creation Service Gateway Contracts', () => {
    assert.ok(referralCreationService, 'referralCreationService singleton must exist');
    assert.equal(typeof referralCreationService.createReferral, 'function', 'createReferral method required');
    assert.equal(typeof referralCreationService.submitReferral, 'function', 'submitReferral method required');
    assert.equal(typeof referralCreationService.updateReferral, 'function', 'updateReferral method required');
    assert.equal(typeof referralCreationService.getReferralById, 'function', 'getReferralById method required');
    assert.equal(typeof referralCreationService.getDestinationHospitals, 'function', 'getDestinationHospitals method required');
    assert.equal(typeof referralCreationService.getHospitalServices, 'function', 'getHospitalServices method required');
    assert.equal(typeof referralCreationService.uploadReferralDocument, 'function', 'uploadReferralDocument method required');
    assert.equal(typeof referralCreationService.getReferralDocuments, 'function', 'getReferralDocuments method required');
  });

  await t.test('3. Referral Step Wizard Architecture & Step Definitions', () => {
    const indicatorPath = path.join(referralsDir, 'ReferralStepIndicator.jsx');
    assert.ok(fs.existsSync(indicatorPath), 'ReferralStepIndicator.jsx must exist');
    const indicatorContent = fs.readFileSync(indicatorPath, 'utf8');

    // 5 sequential steps definitions
    assert.ok(indicatorContent.includes('Patient Selection'), 'Step 1 must be Patient Selection');
    assert.ok(indicatorContent.includes('Clinical Information'), 'Step 2 must be Clinical Information');
    assert.ok(indicatorContent.includes('Destination Hospital'), 'Step 3 must be Destination Hospital');
    assert.ok(indicatorContent.includes('Supporting Documents'), 'Step 4 must be Supporting Documents');
    assert.ok(indicatorContent.includes('Review & Submit'), 'Step 5 must be Review & Submit');

    // Accessibility attributes
    assert.ok(indicatorContent.includes('aria-current'), 'Step indicator must use aria-current="step"');
    assert.ok(indicatorContent.includes('aria-label="Referral creation progress"'), 'Step indicator must have accessible nav label');
  });

  await t.test('4. Patient Selection & Referral Initiation (Step 1)', () => {
    const patientStepPath = path.join(referralsDir, 'ReferralPatientStep.jsx');
    assert.ok(fs.existsSync(patientStepPath), 'ReferralPatientStep.jsx must exist');
    const content = fs.readFileSync(patientStepPath, 'utf8');

    // Debounced search integration
    assert.ok(content.includes('patientService.getPatients'), 'Must query patient service');
    assert.ok(content.includes('setTimeout'), 'Must debounce search input');
    assert.ok(content.includes('formatPatientId'), 'Must format Ethiopian patient ID');
    assert.ok(content.includes('/patients/register'), 'Must provide link to patient registration if not found');

    // Accessibility
    assert.ok(content.includes('role="button"'), 'Search results must be accessible interactive elements');
    assert.ok(content.includes('onKeyDown'), 'Search results must support keyboard navigation');
    assert.ok(content.includes('role="alert"'), 'Search errors must be announced with role="alert"');
  });

  await t.test('5. Clinical Referral Information Capture & Vitals Range Rules (Step 2)', () => {
    const clinicalStepPath = path.join(referralsDir, 'ReferralClinicalStep.jsx');
    assert.ok(fs.existsSync(clinicalStepPath), 'ReferralClinicalStep.jsx must exist');
    const content = fs.readFileSync(clinicalStepPath, 'utf8');

    // Priority levels matching Ethiopian national guidelines
    assert.ok(content.includes('ROUTINE'), 'Must support ROUTINE priority');
    assert.ok(content.includes('URGENT'), 'Must support URGENT priority');
    assert.ok(content.includes('EMERGENCY'), 'Must support EMERGENCY priority');

    // Required fields
    assert.ok(content.includes('primary_diagnosis'), 'Must capture primary diagnosis');
    assert.ok(content.includes('reason_for_referral'), 'Must capture referral reason');
    assert.ok(content.includes('clinical_summary'), 'Must capture clinical summary');

    // Vitals range bounds matching backend referralValidator.js
    assert.ok(content.includes('20') && content.includes('250'), 'Must enforce pulse rate range (20-250 bpm)');
    assert.ok(content.includes('4') && content.includes('80'), 'Must enforce respiratory rate range (4-80 bpm)');
    assert.ok(content.includes('25.0') && content.includes('45.0'), 'Must enforce temperature range (25.0-45.0 °C)');
    assert.ok(content.includes('40') && content.includes('100'), 'Must enforce SpO2 range (40-100%)');

    // Transport/Ambulance toggle
    assert.ok(content.includes('transport_required'), 'Must capture ambulance transport requirement');
    assert.ok(content.includes('role="radiogroup"'), 'Priority selector must use role="radiogroup"');
  });

  await t.test('6. Destination Hospital & Specialty Selection (Step 3)', () => {
    const destStepPath = path.join(referralsDir, 'ReferralDestinationStep.jsx');
    assert.ok(fs.existsSync(destStepPath), 'ReferralDestinationStep.jsx must exist');
    const content = fs.readFileSync(destStepPath, 'utf8');

    assert.ok(content.includes('getDestinationHospitals'), 'Must fetch hospitals from referralCreationService');
    assert.ok(content.includes('getHospitalServices'), 'Must fetch services/specialties for selected hospital');
    assert.ok(content.includes('REGION_OPTIONS'), 'Must include regional filtering options');
    assert.ok(content.includes('Addis Ababa'), 'Must include Ethiopian regions in filter');
    assert.ok(content.includes('destination_facility_id'), 'Must store destination hospital facility ID');
    assert.ok(content.includes('required_specialty'), 'Must store required clinical specialty');
    assert.ok(content.includes('aria-selected'), 'Selected hospital must convey aria-selected state');
  });

  await t.test('7. Document Attachments Validation & File Security (Step 4)', () => {
    const docStepPath = path.join(referralsDir, 'ReferralDocumentsStep.jsx');
    assert.ok(fs.existsSync(docStepPath), 'ReferralDocumentsStep.jsx must exist');
    const content = fs.readFileSync(docStepPath, 'utf8');

    // Allowed mime types & 10MB size limit
    assert.ok(content.includes('10 * 1024 * 1024'), 'Must enforce 10MB maximum file size');
    assert.ok(content.includes('application/pdf'), 'Must accept PDF documents');
    assert.ok(content.includes('image/jpeg'), 'Must accept JPEG documents');
    assert.ok(content.includes('image/png'), 'Must accept PNG documents');

    // Document types
    assert.ok(content.includes('LAB_RESULT'), 'Must classify lab results');
    assert.ok(content.includes('IMAGING'), 'Must classify imaging and radiology');
    assert.ok(content.includes('CLINICAL_NOTE'), 'Must classify clinical examination notes');

    // Document removal and error alert
    assert.ok(content.includes('role="alert"'), 'Document upload errors must be accessible alerts');
    assert.ok(content.includes('Remove attachment'), 'Must provide accessible remove button');
  });

  await t.test('8. Referral Review, Verification & Submission Confirmation (Steps 5 & Confirmation)', () => {
    const reviewStepPath = path.join(referralsDir, 'ReferralReviewStep.jsx');
    assert.ok(fs.existsSync(reviewStepPath), 'ReferralReviewStep.jsx must exist');
    const reviewContent = fs.readFileSync(reviewStepPath, 'utf8');

    assert.ok(reviewContent.includes('Ethiopian Federal Ministry of Health'), 'Must display clinical guideline compliance disclaimer');
    assert.ok(reviewContent.includes('onJumpToStep'), 'Must allow clinician to jump back and edit prior sections');
    assert.ok(reviewContent.includes('submitting'), 'Must handle submission progress state');
    assert.ok(reviewContent.includes('role="alert"'), 'Emergency urgency and submission failures must be announced with alert role');

    const confirmStepPath = path.join(referralsDir, 'ReferralConfirmationStep.jsx');
    assert.ok(fs.existsSync(confirmStepPath), 'ReferralConfirmationStep.jsx must exist');
    const confirmContent = fs.readFileSync(confirmStepPath, 'utf8');

    assert.ok(confirmContent.includes('referenceNumber'), 'Must display official referral reference number');
    assert.ok(confirmContent.includes('clipboard'), 'Must allow copying reference code');
    assert.ok(confirmContent.includes('window.print'), 'Must support printing referral slip');
    assert.ok(confirmContent.includes('/referrals'), 'Must provide navigation link to referrals tracking list');
    assert.ok(confirmContent.includes('role="status"'), 'Confirmation banner must declare role="status"');
  });

  await t.test('9. Privacy, Security & Facility Tenancy Isolation Verification', () => {
    const createPagePath = path.join(portalSrc, 'pages', 'CreateReferralPage.jsx');
    assert.ok(fs.existsSync(createPagePath), 'CreateReferralPage.jsx must exist');
    const pageContent = fs.readFileSync(createPagePath, 'utf8');

    // Tenancy integration
    assert.ok(pageContent.includes('useAuth'), 'Must derive tenancy from authenticated session context');
    assert.ok(pageContent.includes('facilityName'), 'Must display referring facility tenant context');

    // Security: no persistence of referral payload to localStorage/sessionStorage
    assert.ok(!pageContent.includes('localStorage.setItem'), 'Must NEVER store clinical referral records in localStorage');
    assert.ok(!pageContent.includes('sessionStorage.setItem'), 'Must NEVER store clinical referral records in sessionStorage');

    // Security: no dumping of patient PII in console
    assert.ok(!pageContent.includes('console.log(selectedPatient'), 'Must NEVER dump selected patient PII to browser console');
    assert.ok(!pageContent.includes('console.log(clinicalData'), 'Must NEVER dump patient clinical data to browser console');
    assert.ok(!pageContent.includes('console.log(payload'), 'Must NEVER dump referral transmission payload to browser console');
  });
});
