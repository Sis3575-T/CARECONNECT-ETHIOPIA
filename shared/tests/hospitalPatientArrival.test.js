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

test('CareConnect Ethiopia — Part 23 Hospital Patient Arrival, Handover & Receiving Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'hospital', 'src');
  const componentsDir = path.join(portalSrc, 'components', 'arrival');
  const pagesDir = path.join(portalSrc, 'pages');

  await t.test('1. Hospital Patient Arrival Route Protection & Navigation in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HOSPITAL.allowedRoles'), 'Must restrict access to hospital authorized roles');

    // Expected arrival routes
    assert.ok(content.includes('path="arrivals"'), 'Must mount /arrivals queue');
    assert.ok(content.includes('path="arrivals/:referralId"'), 'Must mount /arrivals/:referralId workspace');
    assert.ok(content.includes('path="referrals/:referralId/receiving"'), 'Must mount /referrals/:referralId/receiving alias');
    assert.ok(content.includes('PatientArrivalDetailPage'), 'Must reference PatientArrivalDetailPage');
    assert.ok(content.includes('PatientArrivalsPage'), 'Must reference PatientArrivalsPage');

    // Code-splitting and suspense
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load hospital portal views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap routes with Suspense fallback');
  });

  await t.test('2. Hospital Arrival & Receiving API Gateway Contracts in hospitalService.js', async () => {
    assert.ok(hospitalService, 'hospitalService singleton must exist');

    // Check all required arrival and receiving methods
    assert.equal(typeof hospitalService.getArrivalQueue, 'function', 'getArrivalQueue method required');
    assert.equal(typeof hospitalService.confirmPatientArrival, 'function', 'confirmPatientArrival method required');
    assert.equal(typeof hospitalService.recordPatientHandover, 'function', 'recordPatientHandover method required');
    assert.equal(typeof hospitalService.confirmReceivingAdmission, 'function', 'confirmReceivingAdmission method required');

    // Verify input validation: missing referralId throws Error
    await assert.rejects(
      () => hospitalService.confirmPatientArrival(null),
      /Referral ID required/,
      'confirmPatientArrival must require referralId'
    );
    await assert.rejects(
      () => hospitalService.recordPatientHandover(null),
      /Referral ID required/,
      'recordPatientHandover must require referralId'
    );
    await assert.rejects(
      () => hospitalService.confirmReceivingAdmission(null),
      /Referral ID required/,
      'confirmReceivingAdmission must require referralId'
    );
  });

  await t.test('3. Accepted Referrals Arrival Workspace Architecture (PatientArrivalsPage.jsx)', () => {
    const pagePath = path.join(pagesDir, 'PatientArrivalsPage.jsx');
    assert.ok(fs.existsSync(pagePath), 'PatientArrivalsPage.jsx must exist');
    const content = fs.readFileSync(pagePath, 'utf8');

    // Queue filtering by operational stages
    assert.ok(content.includes('AWAITING_ARRIVAL'), 'Must support Awaiting Departure stage');
    assert.ok(content.includes('EN_ROUTE'), 'Must support En Route / Dispatched stage');
    assert.ok(content.includes('ARRIVED'), 'Must support Arrived Pending Handover stage');
    assert.ok(content.includes('ADMITTED'), 'Must support Admitted to Ward stage');

    // Search and advanced filters
    assert.ok(content.includes('Search'), 'Must support multi-criteria search');
    assert.ok(content.includes('facilityOptions') || content.includes('selectedFacility'), 'Must filter by referring facility');
    assert.ok(content.includes('selectedPriority'), 'Must filter by clinical priority');
    assert.ok(content.includes('selectedDepartment'), 'Must filter by receiving department');

    // Operational metrics and pagination
    assert.ok(content.includes('metrics') || content.includes('awaitingCount'), 'Must compute operational arrival metrics');
    assert.ok(content.includes('totalPages') || content.includes('currentPage'), 'Must support pagination');
    assert.ok(content.includes('useHospitalRealtime'), 'Must synchronize in real-time');
  });

  await t.test('4. Patient Identity Verification Protocol & Mismatch Safeguards (PatientIdentityVerification.jsx)', () => {
    const compPath = path.join(componentsDir, 'PatientIdentityVerification.jsx');
    assert.ok(fs.existsSync(compPath), 'PatientIdentityVerification.jsx must exist');
    const content = fs.readFileSync(compPath, 'utf8');

    // Multi-factor checklist
    assert.ok(content.includes('slipMatched'), 'Must verify paper referral slip against digital code');
    assert.ok(content.includes('patientConfirmed'), 'Must verify active confirmation from patient or guardian');
    assert.ok(content.includes('idCardInspected'), 'Must inspect national Fayda ID or Kebele resident card');
    assert.ok(content.includes('clinicalRecordsMatched'), 'Must verify correspondence of presenting condition to referral diagnosis');

    // Masked Fayda ID
    assert.ok(content.includes('••••-••••-'), 'Must mask Fayda National ID to prevent unauthorized exposure');

    // Discrepancy and mismatch reporting
    assert.ok(content.includes('hasMismatch') || content.includes('mismatchNotes'), 'Must support identity discrepancy reporting');
    assert.ok(content.includes('CRITICAL PATIENT IDENTIFIER MISMATCH') || content.includes('MISMATCH REPORTED'), 'Must display critical mismatch warning');
  });

  await t.test('5. Patient Arrival Registration & Timestamp Tracking (PatientArrivalModal.jsx)', () => {
    const compPath = path.join(componentsDir, 'PatientArrivalModal.jsx');
    assert.ok(fs.existsSync(compPath), 'PatientArrivalModal.jsx must exist');
    const content = fs.readFileSync(compPath, 'utf8');

    // Actual physical arrival timestamp
    assert.ok(content.includes('actualArrivalTime') || content.includes('actual_arrival_time'), 'Must capture actual physical arrival timestamp');
    assert.ok(content.includes('receivingDepartment') || content.includes('receiving_department'), 'Must capture receiving triage bay/department');
    assert.ok(content.includes('receivingStaffName') || content.includes('receiving_staff_name'), 'Must capture receiving staff member attribution');
    assert.ok(content.includes('arrivalNotes') || content.includes('arrival_notes'), 'Must capture arrival condition notes');

    // Submission and duplicate prevention
    assert.ok(content.includes('hospitalService.confirmPatientArrival'), 'Must invoke hospitalService.confirmPatientArrival');
    assert.ok(content.includes('submitting'), 'Must prevent double submission during registration');
  });

  await t.test('6. Patient Handover & Transfer Documentation (PatientHandoverSection.jsx)', () => {
    const compPath = path.join(componentsDir, 'PatientHandoverSection.jsx');
    assert.ok(fs.existsSync(compPath), 'PatientHandoverSection.jsx must exist');
    const content = fs.readFileSync(compPath, 'utf8');

    // Escort and hospital staff attribution
    assert.ok(content.includes('giverName') || content.includes('handover_giver_name'), 'Must capture transferring escort staff name');
    assert.ok(content.includes('receiverName') || content.includes('receiving_staff_name'), 'Must capture hospital receiving staff member');

    // Physical receiving checklist
    assert.ok(content.includes('patientPhysicallyReceived'), 'Must record physical receipt of patient');
    assert.ok(content.includes('paperReferralSlipReceived'), 'Must record receipt of paper referral slip');
    assert.ok(content.includes('belongingsAccountedFor'), 'Must record receipt and accounting of belongings');

    // Exceptions and notes
    assert.ok(content.includes('hasExceptions') || content.includes('exceptionNotes'), 'Must support logging handover exceptions and missing items');
    assert.ok(content.includes('hospitalService.recordPatientHandover'), 'Must invoke hospitalService.recordPatientHandover');
  });

  await t.test('7. Receiving Confirmation & Operational Ward Admission (ReceivingConfirmationModal.jsx)', () => {
    const compPath = path.join(componentsDir, 'ReceivingConfirmationModal.jsx');
    assert.ok(fs.existsSync(compPath), 'ReceivingConfirmationModal.jsx must exist');
    const content = fs.readFileSync(compPath, 'utf8');

    // Review summary before confirmation
    assert.ok(content.includes('patientName') || content.includes('refCode'), 'Must display verified patient and reference summary');
    assert.ok(content.includes('originFacility'), 'Must display originating health centre summary');

    // Ward and bed allocation
    assert.ok(content.includes('ward') || content.includes('admitted_ward'), 'Must capture receiving ward');
    assert.ok(content.includes('bedType') || content.includes('admitted_bed'), 'Must capture allocated bed classification');
    assert.ok(content.includes('confirmingStaff') || content.includes('receiving_staff_name'), 'Must attribute confirming staff member');

    // Explicit confirmation and submission lock
    assert.ok(content.includes('hospitalService.confirmReceivingAdmission'), 'Must invoke hospitalService.confirmReceivingAdmission');
    assert.ok(content.includes('submitting'), 'Must prevent duplicate admission confirmation');
  });

  await t.test('8. Receiving History & Chronological Audit Trail (ReceivingHistoryTimeline.jsx)', () => {
    const compPath = path.join(componentsDir, 'ReceivingHistoryTimeline.jsx');
    assert.ok(fs.existsSync(compPath), 'ReceivingHistoryTimeline.jsx must exist');
    const content = fs.readFileSync(compPath, 'utf8');

    // Event categorization
    assert.ok(content.includes('getEventBadge') || content.includes('BadgeIcon'), 'Must render event outcome badges');
    assert.ok(content.includes('Physical Arrival') || content.includes('Arrival'), 'Must format arrival events');
    assert.ok(content.includes('Escort Handover') || content.includes('Handover'), 'Must format handover events');
    assert.ok(content.includes('Ward Admission') || content.includes('Admission'), 'Must format ward admission events');

    // Staff attribution and timestamps
    assert.ok(content.includes('created_at') || content.includes('formatClinicalDate'), 'Must format event timestamps');
    assert.ok(content.includes('timeline') || content.includes('allTimelineEvents'), 'Must render chronological events timeline');
  });

  await t.test('9. Dedicated Patient Arrival Detail Workspace Integration (PatientArrivalDetailPage.jsx)', () => {
    const pagePath = path.join(pagesDir, 'PatientArrivalDetailPage.jsx');
    assert.ok(fs.existsSync(pagePath), 'PatientArrivalDetailPage.jsx must exist');
    const content = fs.readFileSync(pagePath, 'utf8');

    // Integration of sub-components
    assert.ok(content.includes('PatientIdentityVerification'), 'Must mount PatientIdentityVerification');
    assert.ok(content.includes('PatientArrivalModal'), 'Must mount PatientArrivalModal');
    assert.ok(content.includes('PatientHandoverSection'), 'Must mount PatientHandoverSection');
    assert.ok(content.includes('ReceivingConfirmationModal'), 'Must mount ReceivingConfirmationModal');
    assert.ok(content.includes('ReceivingHistoryTimeline'), 'Must mount ReceivingHistoryTimeline');

    // Lifecycle status stepper
    assert.ok(content.includes('Referral Accepted'), 'Must indicate referral acceptance step');
    assert.ok(content.includes('Physical Arrival'), 'Must indicate physical arrival step');
    assert.ok(content.includes('Clinical Handover'), 'Must indicate clinical handover step');
    assert.ok(content.includes('Receiving & Admission'), 'Must indicate receiving and admission step');

    // Emergency acuity alert
    assert.ok(content.includes('EMERGENCY'), 'Must display emergency transfer arrival warning banner');
  });

  await t.test('10. Security, Tenancy Isolation & Privacy Safeguards', () => {
    const arrivalComponents = [
      'ArrivalStatusBadge.jsx',
      'ArrivalSkeleton.jsx',
      'ArrivalEmptyState.jsx',
      'PatientIdentityVerification.jsx',
      'PatientArrivalModal.jsx',
      'PatientHandoverSection.jsx',
      'ReceivingConfirmationModal.jsx',
      'ReceivingHistoryTimeline.jsx'
    ];

    for (const comp of arrivalComponents) {
      const compPath = path.join(componentsDir, comp);
      assert.ok(fs.existsSync(compPath), `Component ${comp} must exist`);
      const text = fs.readFileSync(compPath, 'utf8');

      // No persistent localStorage leakage
      assert.ok(!text.includes('localStorage.setItem'), `${comp} must not persist patient data or arrival records into localStorage`);

      // No raw unmasked console logging of PII
      assert.ok(!text.includes('console.log('), `${comp} must not leave stray console.log statements that could leak PII`);
    }

    // Tenancy isolation verification in backend referralService
    const backendServicePath = path.join(rootDir, 'backend', 'src', 'services', 'referralService.js');
    assert.ok(fs.existsSync(backendServicePath), 'Backend referralService must exist');
    const backendService = fs.readFileSync(backendServicePath, 'utf8');

    assert.ok(
      backendService.includes('confirmArrival') && backendService.includes('destination_facility_id !== userFacilityId'),
      'Backend confirmArrival must enforce hospital tenancy isolation'
    );
    assert.ok(
      backendService.includes('updateProgress') && backendService.includes('destination_facility_id !== userFacilityId'),
      'Backend updateProgress must enforce hospital tenancy isolation'
    );
  });
});
