import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import {
  hospitalService,
  calculateDischargeMetrics,
  OUTCOME_CATEGORIES
} from '../../portals/hospital/src/services/hospitalService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 25 Hospital Referral Discharge, Transfer & Outcome Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'hospital', 'src');
  const componentsDir = path.join(portalSrc, 'components', 'discharge');
  const pagesDir = path.join(portalSrc, 'pages');

  await t.test('1. Hospital Discharge Route Protection & Navigation in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HOSPITAL.allowedRoles'), 'Must restrict access to hospital authorized roles');

    // Expected discharge routes
    assert.ok(content.includes('path="discharges"'), 'Must mount /discharges workspace');
    assert.ok(content.includes('path="discharges/:referralId"'), 'Must mount /discharges/:referralId detail');
    assert.ok(content.includes('path="referrals/:referralId/discharge"'), 'Must mount /referrals/:referralId/discharge alias');
    assert.ok(content.includes('path="referrals/:referralId/transfer"'), 'Must mount /referrals/:referralId/transfer alias');
    assert.ok(content.includes('DischargeWorkspacePage'), 'Must reference DischargeWorkspacePage');
    assert.ok(content.includes('DischargeDetailPage'), 'Must reference DischargeDetailPage');

    // Lazy-loading and suspense
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load hospital portal views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap routes with Suspense fallback');
  });

  await t.test('2. Hospital Discharge, Transfer & Outcome Gateway Contracts in hospitalService.js', async () => {
    assert.ok(hospitalService, 'hospitalService singleton must exist');

    // Check all required discharge, transfer, and outcome methods
    assert.equal(typeof hospitalService.getDischargeQueue, 'function', 'getDischargeQueue method required');
    assert.equal(typeof hospitalService.getTransferDestinations, 'function', 'getTransferDestinations method required');
    assert.equal(typeof hospitalService.recordDischarge, 'function', 'recordDischarge method required');
    assert.equal(typeof hospitalService.recordTransfer, 'function', 'recordTransfer method required');
    assert.equal(typeof hospitalService.recordReturnToReferrer, 'function', 'recordReturnToReferrer method required');
    assert.equal(typeof hospitalService.recordPatientOutcome, 'function', 'recordPatientOutcome method required');
    assert.equal(typeof hospitalService.getReassignments, 'function', 'getReassignments method required');

    // Input validation: missing referralId throws Error
    await assert.rejects(
      () => hospitalService.recordDischarge(null),
      /Referral ID required/,
      'recordDischarge must require referralId'
    );
    await assert.rejects(
      () => hospitalService.recordTransfer(null),
      /Referral ID required/,
      'recordTransfer must require referralId'
    );
    await assert.rejects(
      () => hospitalService.recordTransfer('ref-100', {}),
      /Target hospital facility ID is required/,
      'recordTransfer must require new_facility_id'
    );
    await assert.rejects(
      () => hospitalService.recordReturnToReferrer(null),
      /Referral ID required/,
      'recordReturnToReferrer must require referralId'
    );
    await assert.rejects(
      () => hospitalService.recordPatientOutcome(null),
      /Referral ID required/,
      'recordPatientOutcome must require referralId'
    );
  });

  await t.test('3. Discharge, Transfer & Outcome Metrics Pure Calculation (calculateDischargeMetrics)', () => {
    const mockReferrals = [
      { id: 'ref-1', status: 'IN_PROGRESS' },
      { id: 'ref-2', status: 'PATIENT_ARRIVED' },
      { id: 'ref-3', status: 'COMPLETED', counter_referral_instructions: null },
      { id: 'ref-4', status: 'TRANSFERRED' },
      { id: 'ref-5', status: 'IN_PROGRESS', reassigned_to_facility_id: 202 },
      { id: 'ref-6', status: 'COMPLETED', completion_reason: 'RETURNED_TO_REFERRING_FACILITY' },
      { id: 'ref-7', status: 'CLOSED' }
    ];

    const metrics = calculateDischargeMetrics(mockReferrals);

    assert.equal(metrics.totalCases, 7, 'Total cases count must equal 7');
    assert.equal(metrics.readyForDischarge, 2, 'Must calculate 2 cases in care (IN_PROGRESS, PATIENT_ARRIVED)');
    assert.equal(metrics.transferredCount, 2, 'Must calculate 2 transferred cases (TRANSFERRED status or reassigned)');
    assert.equal(metrics.dischargedCount, 1, 'Must calculate 1 routine discharge (COMPLETED without counter-referral)');
    assert.equal(metrics.counterReferredCount, 1, 'Must calculate 1 counter-referred case');
    assert.equal(metrics.closedCount, 1, 'Must calculate 1 closed case');
  });

  await t.test('4. Hospital Discharge & Transfer Workspace Architecture (DischargeWorkspacePage.jsx)', () => {
    const filePath = path.join(pagesDir, 'DischargeWorkspacePage.jsx');
    assert.ok(fs.existsSync(filePath), 'DischargeWorkspacePage.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // UI Structure & Metrics
    assert.ok(content.includes('calculateDischargeMetrics'), 'Must integrate calculateDischargeMetrics');
    assert.ok(content.includes('DISCHARGE_TABS'), 'Must provide stage filter tabs');
    assert.ok(content.includes('READY'), 'Must support in care / ready tab');
    assert.ok(content.includes('DISCHARGED'), 'Must support discharged tab');
    assert.ok(content.includes('TRANSFERRED'), 'Must support transferred out tab');
    assert.ok(content.includes('COUNTER_REFERRED'), 'Must support counter-referred tab');
    assert.ok(content.includes('CLOSED'), 'Must support closed dossiers tab');

    // Search and Filters
    assert.ok(content.includes('searchQuery'), 'Must support search query');
    assert.ok(content.includes('selectedDept'), 'Must support department filter');
    assert.ok(content.includes('selectedPriority'), 'Must support priority filter');
    assert.ok(content.includes('selectedDateRange'), 'Must support date filter');
    assert.ok(content.includes('sortBy'), 'Must support sorting');
    assert.ok(content.includes('handleResetFilters'), 'Must support filter reset');

    // Pagination & Real-time
    assert.ok(content.includes('currentPage'), 'Must support pagination');
    assert.ok(content.includes('useHospitalRealtime'), 'Must integrate real-time telemetry');
    assert.ok(content.includes('destination_facility_id === user.facilityId'), 'Must isolate records by hospital tenancy');
  });

  await t.test('5. Authorized Clinical Discharge Documentation Workflow (DischargeDocumentationModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'DischargeDocumentationModal.jsx');
    assert.ok(fs.existsSync(filePath), 'DischargeDocumentationModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Dispositions
    assert.ok(content.includes('ROUTINE_HOME'), 'Must support ROUTINE_HOME disposition');
    assert.ok(content.includes('STABILIZED'), 'Must support STABILIZED disposition');
    assert.ok(content.includes('SPECIALIST_CARE_DELIVERED'), 'Must support SPECIALIST_CARE_DELIVERED disposition');
    assert.ok(content.includes('AGAINST_MEDICAL_ADVICE'), 'Must support AGAINST_MEDICAL_ADVICE disposition');

    // Required fields & safeguards
    assert.ok(content.includes('clinicalSummary'), 'Must capture clinical summary');
    assert.ok(content.includes('clinicianSignature'), 'Must capture attending clinician signature');
    assert.ok(content.includes('confirmedByClinician'), 'Must require explicit confirmation checkbox');
    assert.ok(content.includes('destination_facility_id'), 'Must check hospital facility tenancy');
    assert.ok(content.includes('recordDischarge'), 'Must invoke hospitalService.recordDischarge');
  });

  await t.test('6. Human-Directed Inter-Facility Transfer Workflow (InterFacilityTransferModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'InterFacilityTransferModal.jsx');
    assert.ok(fs.existsSync(filePath), 'InterFacilityTransferModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Transfer Reasons
    assert.ok(content.includes('CLINICAL_ESCALATION'), 'Must support CLINICAL_ESCALATION reason');
    assert.ok(content.includes('SERVICE_UNAVAILABLE'), 'Must support SERVICE_UNAVAILABLE reason');
    assert.ok(content.includes('INSUFFICIENT_CAPACITY'), 'Must support INSUFFICIENT_CAPACITY reason');
    assert.ok(content.includes('OPERATIONAL_DIRECTIVE'), 'Must support OPERATIONAL_DIRECTIVE reason');

    // Escort options & Human choice
    assert.ok(content.includes('getTransferDestinations'), 'Must query registered hospital destinations');
    assert.ok(content.includes('escortLevel'), 'Must support medical escort specification');
    assert.ok(content.includes('confirmedByClinician'), 'Must require explicit clinician authorization');
    assert.ok(content.includes('recordTransfer'), 'Must invoke hospitalService.recordTransfer');
  });

  await t.test('7. Return-to-Referring-Facility Counter-Referral Workflow (ReturnToReferrerModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReturnToReferrerModal.jsx');
    assert.ok(fs.existsSync(filePath), 'ReturnToReferrerModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Primary health centre handover
    assert.ok(content.includes('originFacilityName'), 'Must clearly display originating health centre');
    assert.ok(content.includes('counterInstructions'), 'Must capture health centre care instructions');
    assert.ok(content.includes('ongoingPrescriptions'), 'Must capture ongoing medication regimen');
    assert.ok(content.includes('redFlags'), 'Must capture red flag warning indicators');
    assert.ok(content.includes('reviewSchedule'), 'Must specify primary review schedule');
    assert.ok(content.includes('confirmedByClinician'), 'Must require clinician confirmation');
    assert.ok(content.includes('recordReturnToReferrer'), 'Must invoke hospitalService.recordReturnToReferrer');
  });

  await t.test('8. Standardized Patient Outcome Evaluation & Clinical Integrity (PatientOutcomeModal.jsx & PatientOutcomeSection.jsx)', () => {
    const modalPath = path.join(componentsDir, 'PatientOutcomeModal.jsx');
    const sectionPath = path.join(componentsDir, 'PatientOutcomeSection.jsx');

    assert.ok(fs.existsSync(modalPath), 'PatientOutcomeModal.jsx must exist');
    assert.ok(fs.existsSync(sectionPath), 'PatientOutcomeSection.jsx must exist');

    const modalContent = fs.readFileSync(modalPath, 'utf8');
    const sectionContent = fs.readFileSync(sectionPath, 'utf8');

    // Standardized outcome categories
    assert.ok(Array.isArray(OUTCOME_CATEGORIES), 'OUTCOME_CATEGORIES must be exported array');
    const codes = OUTCOME_CATEGORIES.map(c => c.value);
    assert.ok(codes.includes('CLINICALLY_IMPROVED'), 'Must include CLINICALLY_IMPROVED');
    assert.ok(codes.includes('SPECIALIST_OBJECTIVE_RESOLVED'), 'Must include SPECIALIST_OBJECTIVE_RESOLVED');
    assert.ok(codes.includes('STABILIZED'), 'Must include STABILIZED');
    assert.ok(codes.includes('UNCHANGED'), 'Must include UNCHANGED');
    assert.ok(codes.includes('TRANSFERRED_SUPER_SPECIALTY'), 'Must include TRANSFERRED_SUPER_SPECIALTY');
    assert.ok(codes.includes('SELF_DISCHARGED'), 'Must include SELF_DISCHARGED');
    assert.ok(codes.includes('DECEASED'), 'Must include DECEASED');

    // Clinical integrity check: Never infer recovery from discharge alone
    assert.ok(
      modalContent.includes('Never infer clinical recovery simply because a patient was discharged'),
      'Must embed clinical integrity standard warning'
    );
    assert.ok(modalContent.includes('functionalStatus'), 'Must assess functional mobility status');
    assert.ok(modalContent.includes('recordPatientOutcome'), 'Must invoke hospitalService.recordPatientOutcome');
  });

  await t.test('9. Chronological Care, Transfer & Outcome Audit Trail (DischargeHistoryTimeline.jsx)', () => {
    const filePath = path.join(componentsDir, 'DischargeHistoryTimeline.jsx');
    assert.ok(fs.existsSync(filePath), 'DischargeHistoryTimeline.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Event synthesis
    assert.ok(content.includes('reassignments'), 'Must synthesize inter-facility transfers');
    assert.ok(content.includes('followUps'), 'Must synthesize follow-up coordination events');
    assert.ok(content.includes('filterType'), 'Must provide event category filtering');
    assert.ok(content.includes('sortOrder'), 'Must provide chronological ordering');
    assert.ok(content.includes('formatClinicalDate'), 'Must format clinical dates');
    assert.ok(content.includes('formatRelativeTime'), 'Must display relative time intervals');
  });

  await t.test('10. Security, Tenancy Isolation & Privacy Safeguards', () => {
    // 1. Component security & Zero PII persistence checks
    const dischargeComponents = [
      'DischargeStatusBadge.jsx',
      'DischargeSkeleton.jsx',
      'DischargeEmptyState.jsx',
      'DischargeDocumentationModal.jsx',
      'InterFacilityTransferModal.jsx',
      'ReturnToReferrerModal.jsx',
      'PatientOutcomeModal.jsx',
      'PatientOutcomeSection.jsx',
      'DischargeHistoryTimeline.jsx'
    ];

    for (const comp of dischargeComponents) {
      const compPath = path.join(componentsDir, comp);
      assert.ok(fs.existsSync(compPath), `Component ${comp} must exist`);
      const text = fs.readFileSync(compPath, 'utf8');

      // No persistent localStorage leakage
      assert.ok(!text.includes('localStorage.setItem'), `${comp} must not persist patient data into localStorage`);

      // No raw unmasked console logging of PII
      assert.ok(!text.includes('console.log('), `${comp} must not leave stray console.log statements`);
    }

    // 2. Tenancy enforcement in DischargeDetailPage & DischargeWorkspacePage
    const detailContent = fs.readFileSync(path.join(pagesDir, 'DischargeDetailPage.jsx'), 'utf8');
    assert.ok(detailContent.includes('destination_facility_id !== user.facilityId'), 'Must enforce destination hospital tenancy in detail page');

    const workspaceContent = fs.readFileSync(path.join(pagesDir, 'DischargeWorkspacePage.jsx'), 'utf8');
    assert.ok(workspaceContent.includes('destination_facility_id === user.facilityId'), 'Must enforce hospital facility tenancy in workspace');

    // 3. Navigation item in HospitalLayout.jsx
    const layoutContent = fs.readFileSync(path.join(portalSrc, 'layouts', 'HospitalLayout.jsx'), 'utf8');
    assert.ok(layoutContent.includes('/discharges'), 'HospitalLayout must include /discharges navigation link');
  });
});
