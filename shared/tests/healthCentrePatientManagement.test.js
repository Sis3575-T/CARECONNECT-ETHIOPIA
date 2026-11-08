import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import { patientService } from '../../portals/health-centre/src/services/patientService.js';
import {
  formatClinicalDate,
  formatEthiopianPhone,
  formatPatientId
} from '../utils/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 18 Health Centre Patient Management Test Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'health-centre', 'src');

  await t.test('1. Patient Management Route Structure & Security in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HEALTH_CENTRE.allowedRoles'), 'App.jsx must restrict access to health centre allowed roles');

    // Dedicated patient management route hierarchy
    assert.ok(content.includes('path="patients"'), 'Must mount /patients workspace route');
    assert.ok(content.includes('path="patients/register"'), 'Must mount /patients/register form route');
    assert.ok(content.includes('path="patients/:patientId"'), 'Must mount /patients/:patientId profile route');
    assert.ok(content.includes('path="patients/:patientId/edit"'), 'Must mount /patients/:patientId/edit modification route');

    // Performance code-splitting
    assert.ok(content.includes('lazy('), 'App.jsx must utilize React.lazy for route code-splitting');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap lazy-loaded routes with Suspense');
    assert.ok(content.includes('RouteLoadingFallback'), 'App.jsx must provide accessible RouteLoadingFallback');
  });

  await t.test('2. Patient Service API Client Gateway Interface Contracts', () => {
    assert.ok(patientService, 'patientService singleton must exist');
    assert.equal(typeof patientService.getPatients, 'function', 'getPatients method required');
    assert.equal(typeof patientService.getPatientById, 'function', 'getPatientById method required');
    assert.equal(typeof patientService.registerPatient, 'function', 'registerPatient method required');
    assert.equal(typeof patientService.updatePatient, 'function', 'updatePatient method required');
    assert.equal(typeof patientService.updatePatientStatus, 'function', 'updatePatientStatus method required');
    assert.equal(typeof patientService.recordCorrection, 'function', 'recordCorrection method required');
    assert.equal(typeof patientService.getPatientHistory, 'function', 'getPatientHistory method required');
    assert.equal(typeof patientService.identifyPatients, 'function', 'identifyPatients method required');
    assert.equal(typeof patientService.getPossibleDuplicates, 'function', 'getPossibleDuplicates method required');
    assert.equal(typeof patientService.recordDuplicateReview, 'function', 'recordDuplicateReview method required');
    assert.equal(typeof patientService.getEmergencyContacts, 'function', 'getEmergencyContacts method required');
    assert.equal(typeof patientService.addEmergencyContact, 'function', 'addEmergencyContact method required');
    assert.equal(typeof patientService.updateEmergencyContact, 'function', 'updateEmergencyContact method required');
    assert.equal(typeof patientService.deleteEmergencyContact, 'function', 'deleteEmergencyContact method required');
    assert.equal(typeof patientService.getPatientReferrals, 'function', 'getPatientReferrals method required');
  });

  await t.test('3. Patient Management Workspace Components & Exports', () => {
    const patientsPagePath = path.join(portalSrc, 'pages', 'PatientsPage.jsx');
    const tablePath = path.join(portalSrc, 'components', 'patients', 'PatientTable.jsx');
    const badgePath = path.join(portalSrc, 'components', 'patients', 'PatientStatusBadge.jsx');
    const searchFilterPath = path.join(portalSrc, 'components', 'patients', 'PatientSearchFilter.jsx');
    const paginationPath = path.join(portalSrc, 'components', 'patients', 'PatientPagination.jsx');
    const skeletonPath = path.join(portalSrc, 'components', 'patients', 'PatientLoadingSkeleton.jsx');
    const errorStatePath = path.join(portalSrc, 'components', 'patients', 'PatientErrorState.jsx');

    assert.ok(fs.existsSync(patientsPagePath), 'PatientsPage.jsx must exist');
    assert.ok(fs.existsSync(tablePath), 'PatientTable.jsx must exist');
    assert.ok(fs.existsSync(badgePath), 'PatientStatusBadge.jsx must exist');
    assert.ok(fs.existsSync(searchFilterPath), 'PatientSearchFilter.jsx must exist');
    assert.ok(fs.existsSync(paginationPath), 'PatientPagination.jsx must exist');
    assert.ok(fs.existsSync(skeletonPath), 'PatientLoadingSkeleton.jsx must exist');
    assert.ok(fs.existsSync(errorStatePath), 'PatientErrorState.jsx must exist');

    const tableContent = fs.readFileSync(tablePath, 'utf8');
    assert.ok(tableContent.includes('formatPatientId'), 'PatientTable must format reference IDs');
    assert.ok(tableContent.includes('formatClinicalDate'), 'PatientTable must format registration dates');
    assert.ok(tableContent.includes('formatEthiopianPhone'), 'PatientTable must format Ethiopian phone numbers');
    assert.ok(tableContent.includes('aria-label'), 'PatientTable must implement accessible ARIA labels');
    assert.ok(tableContent.includes('caption'), 'PatientTable must provide table caption for screen readers');
  });

  await t.test('4. Patient Registration Form Validation & Ethiopian Demographics Contract', () => {
    const regFormPath = path.join(portalSrc, 'components', 'patients', 'PatientRegistrationForm.jsx');
    const regPagePath = path.join(portalSrc, 'pages', 'PatientRegisterPage.jsx');
    assert.ok(fs.existsSync(regFormPath), 'PatientRegistrationForm.jsx must exist');
    assert.ok(fs.existsSync(regPagePath), 'PatientRegisterPage.jsx must exist');

    const content = fs.readFileSync(regFormPath, 'utf8');

    // Patronymic given name and father's name
    assert.ok(content.includes('first_name'), 'Must include patronymic first_name input');
    assert.ok(content.includes('father_name'), 'Must include patronymic father_name input');
    assert.ok(content.includes('grandfather_name'), 'Must include patronymic grandfather_name input');

    // Ethiopian Age vs DOB logic
    assert.ok(content.includes('dob_mode'), 'Must allow switching between exact DOB and estimated age');
    assert.ok(content.includes('is_dob_estimated'), 'Must track estimated age flag');
    assert.ok(content.includes('age_years'), 'Must capture age in years');

    // Official Identifiers
    assert.ok(content.includes('national_id'), 'Must support optional Fayda National ID');
    assert.ok(content.includes('kebele_id'), 'Must support optional Kebele resident ID');
    assert.ok(content.includes('medical_record_number'), 'Must support facility MRN');

    // Pre-registration duplicate checking
    assert.ok(content.includes('identifyPatients'), 'Must perform debounced duplicate candidate pre-check');
    assert.ok(content.includes('duplicateCandidates'), 'Must present duplicate candidates warning banner');

    // Phone & Maternal Health
    assert.ok(content.includes('phone_number'), 'Must support phone input');
    assert.ok(content.includes('is_pregnant'), 'Must support maternal pregnancy indicator');
    assert.ok(content.includes('edd_date'), 'Must capture estimated delivery date when pregnant');

    // Emergency Contact & Clinical Baseline
    assert.ok(content.includes('emergency_contact_name'), 'Must capture emergency contact name');
    assert.ok(content.includes('emergency_contact_phone'), 'Must capture emergency contact phone');
    assert.ok(content.includes('emergency_contact_relation'), 'Must capture emergency contact relation');
    assert.ok(content.includes('blood_type'), 'Must support clinical blood group selection');
    assert.ok(content.includes('known_allergies'), 'Must support clinical allergies');
    assert.ok(content.includes('chronic_conditions'), 'Must support chronic illnesses');
  });

  await t.test('5. Server-Side Patient Search, Filtering and Pagination Architecture', () => {
    const filterPath = path.join(portalSrc, 'components', 'patients', 'PatientSearchFilter.jsx');
    const filterContent = fs.readFileSync(filterPath, 'utf8');

    // Filter controls
    assert.ok(filterContent.includes('onSearchChange'), 'Must emit search query updates');
    assert.ok(filterContent.includes('onGenderChange'), 'Must support gender filtering');
    assert.ok(filterContent.includes('onStatusChange'), 'Must support status filtering');
    assert.ok(filterContent.includes('onRegionChange'), 'Must support regional geography filtering');
    assert.ok(filterContent.includes('onWoredaChange'), 'Must support woreda text filtering');
    assert.ok(filterContent.includes('onReset'), 'Must provide clear/reset filters action');

    // Debouncing
    assert.ok(filterContent.includes('setTimeout'), 'Must debounce search input to prevent unnecessary network load');

    // Pagination component
    const pagPath = path.join(portalSrc, 'components', 'patients', 'PatientPagination.jsx');
    const pagContent = fs.readFileSync(pagPath, 'utf8');
    assert.ok(pagContent.includes('onPageChange'), 'Must support page navigation');
    assert.ok(pagContent.includes('onPageSizeChange'), 'Must allow page size selection (10, 20, 50)');
    assert.ok(pagContent.includes('totalPages'), 'Must compute total pages');
  });

  await t.test('6. Patient Profile Overview & Care Coordination History Architecture', () => {
    const detailPath = path.join(portalSrc, 'pages', 'PatientDetailPage.jsx');
    const overviewCardPath = path.join(portalSrc, 'components', 'patients', 'PatientOverviewCard.jsx');
    const referralHistPath = path.join(portalSrc, 'components', 'patients', 'PatientReferralHistory.jsx');
    const auditHistPath = path.join(portalSrc, 'components', 'patients', 'PatientAuditHistory.jsx');

    assert.ok(fs.existsSync(detailPath), 'PatientDetailPage.jsx must exist');
    assert.ok(fs.existsSync(overviewCardPath), 'PatientOverviewCard.jsx must exist');
    assert.ok(fs.existsSync(referralHistPath), 'PatientReferralHistory.jsx must exist');
    assert.ok(fs.existsSync(auditHistPath), 'PatientAuditHistory.jsx must exist');

    const detailContent = fs.readFileSync(detailPath, 'utf8');
    assert.ok(detailContent.includes('getPatientById'), 'Must fetch authorized patient record');
    assert.ok(detailContent.includes('getPatientReferrals'), 'Must fetch care coordination referral history');
    assert.ok(detailContent.includes('getPatientHistory'), 'Must fetch corrections and duplicate reviews audit history');
    assert.ok(detailContent.includes('403'), 'Must handle 403 cross-facility access rejection gracefully');
    assert.ok(detailContent.includes('404'), 'Must handle 404 missing patient safely');
  });

  await t.test('7. Patient Editing, Corrections & Duplicate Review Experience', () => {
    const editPagePath = path.join(portalSrc, 'pages', 'PatientEditPage.jsx');
    const editFormPath = path.join(portalSrc, 'components', 'patients', 'PatientEditForm.jsx');
    const dupSectionPath = path.join(portalSrc, 'components', 'patients', 'PatientDuplicateReviewSection.jsx');

    assert.ok(fs.existsSync(editPagePath), 'PatientEditPage.jsx must exist');
    assert.ok(fs.existsSync(editFormPath), 'PatientEditForm.jsx must exist');
    assert.ok(fs.existsSync(dupSectionPath), 'PatientDuplicateReviewSection.jsx must exist');

    const editFormContent = fs.readFileSync(editFormPath, 'utf8');
    assert.ok(editFormContent.includes('updatePatient'), 'Must call patient update API');
    assert.ok(editFormContent.includes('updatePatientStatus'), 'Must allow status change with rationale');
    assert.ok(editFormContent.includes('correction_reason'), 'Must capture clinical correction reason for audit log');

    const dupContent = fs.readFileSync(dupSectionPath, 'utf8');
    assert.ok(dupContent.includes('getPossibleDuplicates'), 'Must fetch possible duplicates from backend');
    assert.ok(dupContent.includes('recordDuplicateReview'), 'Must submit duplicate review decision');
    assert.ok(dupContent.includes('CONFIRMED_MATCH'), 'Must support CONFIRMED_MATCH review outcome');
    assert.ok(dupContent.includes('FALSE_POSITIVE'), 'Must support FALSE_POSITIVE review outcome');
    assert.ok(dupContent.includes('UNDER_INVESTIGATION'), 'Must support UNDER_INVESTIGATION review outcome');
    assert.ok(!dupContent.includes('mergeRecords'), 'Must NEVER perform client-side autonomous merge');
  });

  await t.test('8. Clinical Data Formatting & Localization Utility Verification', () => {
    // Clinical date formatting
    const formattedDate = formatClinicalDate('2026-11-08T14:30:00.000Z');
    assert.ok(formattedDate.includes('2026'), 'Date must include year 2026');
    assert.ok(formattedDate.includes('Nov'), 'Date must include short month Nov');

    // Ethiopian Phone formatting
    assert.equal(formatEthiopianPhone('+251911445566'), '+251 91 144 5566');
    assert.equal(formatEthiopianPhone('0911445566'), '+251 91 144 5566');
    assert.equal(formatEthiopianPhone('911445566'), '+251 91 144 5566');
    assert.equal(formatEthiopianPhone(null), '—');

    // Reference ID formatting
    assert.equal(formatPatientId('eth-pat-2026-ab12cd'), 'ETH-PAT-2026-AB12CD');
    assert.equal(formatPatientId(''), '—');
  });

  await t.test('9. Patient Privacy and Persistent Storage Safety Verification', () => {
    // Verify no patient sensitive PII is persisted to localStorage
    const patientFiles = [
      path.join(portalSrc, 'pages', 'PatientsPage.jsx'),
      path.join(portalSrc, 'pages', 'PatientRegisterPage.jsx'),
      path.join(portalSrc, 'pages', 'PatientDetailPage.jsx'),
      path.join(portalSrc, 'pages', 'PatientEditPage.jsx'),
      path.join(portalSrc, 'components', 'patients', 'PatientRegistrationForm.jsx'),
      path.join(portalSrc, 'components', 'patients', 'PatientEditForm.jsx'),
      path.join(portalSrc, 'components', 'patients', 'PatientDuplicateReviewSection.jsx'),
      path.join(portalSrc, 'services', 'patientService.js')
    ];

    for (const filePath of patientFiles) {
      const code = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        !code.includes('localStorage.setItem("patient') &&
        !code.includes('localStorage.setItem("patients') &&
        !code.includes("localStorage.setItem('patient") &&
        !code.includes("localStorage.setItem('patients"),
        `File ${path.basename(filePath)} must not store patient records in localStorage`
      );
    }
  });
});
