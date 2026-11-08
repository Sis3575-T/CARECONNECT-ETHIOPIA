import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PORTALS } from '../constants/portals.js';
import { ROLES } from '../constants/roles.js';
import {
  hospitalService,
  calculateAdmissionMetrics
} from '../../portals/hospital/src/services/hospitalService.js';
import { formatPatientId } from '../utils/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('CareConnect Ethiopia — Part 24 Hospital Admission Tracking, Care Progress & Completion Suite', async (t) => {
  const portalSrc = path.join(rootDir, 'portals', 'hospital', 'src');
  const componentsDir = path.join(portalSrc, 'components', 'admission');
  const pagesDir = path.join(portalSrc, 'pages');

  await t.test('1. Hospital Admission Route Protection & Navigation in App.jsx', () => {
    const appPath = path.join(portalSrc, 'App.jsx');
    assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
    const content = fs.readFileSync(appPath, 'utf8');

    // Route guards
    assert.ok(content.includes('ProtectedRoute'), 'App.jsx must enforce ProtectedRoute');
    assert.ok(content.includes('RoleRoute'), 'App.jsx must enforce RoleRoute');
    assert.ok(content.includes('PORTALS.HOSPITAL.allowedRoles'), 'Must restrict access to hospital authorized roles');

    // Expected admission routes
    assert.ok(content.includes('path="admissions"'), 'Must mount /admissions queue');
    assert.ok(content.includes('path="admissions/:referralId"'), 'Must mount /admissions/:referralId workspace');
    assert.ok(content.includes('path="referrals/:referralId/progress"'), 'Must mount /referrals/:referralId/progress alias');
    assert.ok(content.includes('path="referrals/:referralId/admission"'), 'Must mount /referrals/:referralId/admission alias');
    assert.ok(content.includes('AdmissionsWorkspacePage'), 'Must reference AdmissionsWorkspacePage');
    assert.ok(content.includes('AdmissionDetailPage'), 'Must reference AdmissionDetailPage');

    // Code-splitting and suspense
    assert.ok(content.includes('lazy('), 'App.jsx must lazy-load hospital portal views');
    assert.ok(content.includes('Suspense'), 'App.jsx must wrap routes with Suspense fallback');
  });

  await t.test('2. Hospital Admission & Progress API Gateway Contracts in hospitalService.js', async () => {
    assert.ok(hospitalService, 'hospitalService singleton must exist');

    // Check all required admission and progress methods
    assert.equal(typeof hospitalService.getAdmissionsQueue, 'function', 'getAdmissionsQueue method required');
    assert.equal(typeof hospitalService.getHospitalDepartments, 'function', 'getHospitalDepartments method required');
    assert.equal(typeof hospitalService.getHospitalServices, 'function', 'getHospitalServices method required');
    assert.equal(typeof hospitalService.getHospitalStaff, 'function', 'getHospitalStaff method required');
    assert.equal(typeof hospitalService.assignDepartment, 'function', 'assignDepartment method required');
    assert.equal(typeof hospitalService.recordCareProgress, 'function', 'recordCareProgress method required');
    assert.equal(typeof hospitalService.completeReferral, 'function', 'completeReferral method required');
    assert.equal(typeof hospitalService.closeReferral, 'function', 'closeReferral method required');

    // Verify input validation: missing referralId throws Error
    await assert.rejects(
      () => hospitalService.assignDepartment(null),
      /Referral ID required/,
      'assignDepartment must require referralId'
    );
    await assert.rejects(
      () => hospitalService.recordCareProgress(null),
      /Referral ID required/,
      'recordCareProgress must require referralId'
    );
    await assert.rejects(
      () => hospitalService.completeReferral(null),
      /Referral ID required/,
      'completeReferral must require referralId'
    );
    await assert.rejects(
      () => hospitalService.closeReferral(null),
      /Referral ID required/,
      'closeReferral must require referralId'
    );
  });

  await t.test('3. Inpatient Admission Metrics Pure Calculation (calculateAdmissionMetrics)', () => {
    const mockReferrals = [
      { id: 'ref-1', status: 'PATIENT_ARRIVED', assigned_bed_type: 'STANDARD' },
      { id: 'ref-2', status: 'ARRIVED', assigned_bed_type: 'EMERGENCY_OBSERVATION' },
      { id: 'ref-3', status: 'IN_PROGRESS', assigned_bed_type: 'ICU' },
      { id: 'ref-4', status: 'IN_PROGRESS', assigned_bed_type: 'STANDARD' },
      { id: 'ref-5', status: 'COMPLETED', assigned_bed_type: 'STANDARD' },
      { id: 'ref-6', status: 'CLOSED', assigned_bed_type: 'STANDARD' }
    ];

    const metrics = calculateAdmissionMetrics(mockReferrals);

    assert.equal(metrics.totalAdmissions, 6, 'Total admissions count must equal 6');
    assert.equal(metrics.receivedPendingAdmission, 2, 'Must calculate 2 cases awaiting placement (PATIENT_ARRIVED / ARRIVED)');
    assert.equal(metrics.inProgressAdmitted, 2, 'Must calculate 2 cases admitted in active care (IN_PROGRESS)');
    assert.equal(metrics.completedCount, 1, 'Must calculate 1 completed case');
    assert.equal(metrics.closedCount, 1, 'Must calculate 1 closed case');
    assert.equal(metrics.icuCount, 1, 'Must calculate 1 ICU bed placement');
    assert.equal(metrics.emergencyObsCount, 1, 'Must calculate 1 emergency observation placement');
    assert.equal(metrics.activeInpatientTotal, 4, 'Must tally 4 active inpatient cases (arrived + in progress)');
  });

  await t.test('4. Hospital Admission Tracking Workspace Architecture (AdmissionsWorkspacePage.jsx)', () => {
    const filePath = path.join(pagesDir, 'AdmissionsWorkspacePage.jsx');
    assert.ok(fs.existsSync(filePath), 'AdmissionsWorkspacePage.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // UI Structure & Metrics
    assert.ok(content.includes('calculateAdmissionMetrics'), 'Must integrate calculateAdmissionMetrics');
    assert.ok(content.includes('STAGE_TABS'), 'Must provide stage filter tabs');
    assert.ok(content.includes('PENDING_PLACEMENT'), 'Must support PENDING_PLACEMENT tab');
    assert.ok(content.includes('IN_PROGRESS'), 'Must support IN_PROGRESS tab');
    assert.ok(content.includes('COMPLETED'), 'Must support COMPLETED tab');

    // Search and Filters
    assert.ok(content.includes('searchQuery'), 'Must support search query');
    assert.ok(content.includes('selectedDept'), 'Must support department filter');
    assert.ok(content.includes('selectedBedType'), 'Must support bed type filter');
    assert.ok(content.includes('selectedDateRange'), 'Must support date filter');
    assert.ok(content.includes('sortBy'), 'Must support sorting');
    assert.ok(content.includes('resetFilters'), 'Must support filter reset');

    // Pagination & Real-time
    assert.ok(content.includes('currentPage'), 'Must support pagination');
    assert.ok(content.includes('useHospitalRealtime'), 'Must integrate real-time telemetry');
  });

  await t.test('5. Hospital Department & Service Assignment Modal (DepartmentAssignmentModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'DepartmentAssignmentModal.jsx');
    assert.ok(fs.existsSync(filePath), 'DepartmentAssignmentModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Data integration
    assert.ok(content.includes('getHospitalDepartments'), 'Must load active hospital departments');
    assert.ok(content.includes('getHospitalServices'), 'Must load clinical services');
    assert.ok(content.includes('getHospitalStaff'), 'Must load active hospital staff');
    assert.ok(content.includes('assignDepartment'), 'Must invoke assignDepartment');

    // Safeguards
    assert.ok(content.includes('isReassignment'), 'Must distinguish initial assignment from transfer/reassignment');
    assert.ok(content.includes('submitting'), 'Must prevent double submission');
    assert.ok(content.includes('destination_facility_id'), 'Must check hospital facility tenancy');
  });

  await t.test('6. Inpatient Admission Records & Status Tracking (AdmissionRecordCard.jsx)', () => {
    const filePath = path.join(componentsDir, 'AdmissionRecordCard.jsx');
    assert.ok(fs.existsSync(filePath), 'AdmissionRecordCard.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Lifecycle steps distinction
    assert.ok(content.includes('Referral Accepted'), 'Must display Referral Accepted step');
    assert.ok(content.includes('Patient Arrived'), 'Must display Patient Arrived step');
    assert.ok(content.includes('Inpatient Admission'), 'Must display Inpatient Admission step');
    assert.ok(content.includes('Care Completed'), 'Must display Care Completed step');
    assert.ok(content.includes('Dossier Closed'), 'Must display Dossier Closed step');

    // Inpatient details display
    assert.ok(content.includes('allocated_ward_department'), 'Must display allocated department');
    assert.ok(content.includes('assigned_bed_type'), 'Must display assigned bed type');
    assert.ok(content.includes('Confirm Ward Admission'), 'Must offer explicit operational ward admission action');
  });

  await t.test('7. Clinical Care Progress Tracking & Events (ProgressUpdateModal.jsx & CareProgressWorkspace.jsx)', () => {
    const modalPath = path.join(componentsDir, 'ProgressUpdateModal.jsx');
    const workspacePath = path.join(componentsDir, 'CareProgressWorkspace.jsx');

    assert.ok(fs.existsSync(modalPath), 'ProgressUpdateModal.jsx must exist');
    assert.ok(fs.existsSync(workspacePath), 'CareProgressWorkspace.jsx must exist');

    const modalContent = fs.readFileSync(modalPath, 'utf8');
    const workspaceContent = fs.readFileSync(workspacePath, 'utf8');

    // Event options
    assert.ok(modalContent.includes('SERVICE_COMMENCED'), 'Must support SERVICE_COMMENCED event');
    assert.ok(modalContent.includes('TREATMENT_MILESTONE'), 'Must support TREATMENT_MILESTONE event');
    assert.ok(modalContent.includes('INTER_DEPARTMENTAL_CONSULT'), 'Must support INTER_DEPARTMENTAL_CONSULT event');
    assert.ok(modalContent.includes('OPERATIONAL_DELAY'), 'Must support OPERATIONAL_DELAY event');
    assert.ok(modalContent.includes('DISCHARGE_PLANNING'), 'Must support DISCHARGE_PLANNING event');

    // Workspace readiness checklist
    assert.ok(workspaceContent.includes('Inpatient Care Readiness'), 'Must display inpatient checklist');
    assert.ok(workspaceContent.includes('followUps'), 'Must render chronological progress stream');
  });

  await t.test('8. Hospital Referral Completion & Closure Workflow (ReferralCompletionModal.jsx)', () => {
    const filePath = path.join(componentsDir, 'ReferralCompletionModal.jsx');
    assert.ok(fs.existsSync(filePath), 'ReferralCompletionModal.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Completion categories
    assert.ok(content.includes('SPECIALIST_CARE_DELIVERED'), 'Must support SPECIALIST_CARE_DELIVERED');
    assert.ok(content.includes('STABILIZED_AND_COUNTER_REFERRED'), 'Must support STABILIZED_AND_COUNTER_REFERRED');
    assert.ok(content.includes('TRANSFERRED_EXTERNAL'), 'Must support TRANSFERRED_EXTERNAL');
    assert.ok(content.includes('PATIENT_SELF_DISCHARGED'), 'Must support PATIENT_SELF_DISCHARGED');

    // Human confirmation safeguard
    assert.ok(content.includes('confirmedByClinician'), 'Must require explicit clinician confirmation');
    assert.ok(content.includes('counterReferralNotes'), 'Must support counter-referral instructions');
    assert.ok(content.includes('autoCloseDossier'), 'Must support optional administrative dossier closure');
  });

  await t.test('9. Admission History Timeline & Audit Trail (AdmissionHistoryTimeline.jsx)', () => {
    const filePath = path.join(componentsDir, 'AdmissionHistoryTimeline.jsx');
    assert.ok(fs.existsSync(filePath), 'AdmissionHistoryTimeline.jsx must exist');
    const content = fs.readFileSync(filePath, 'utf8');

    // Timeline synthesis
    assert.ok(content.includes('status_history'), 'Must synthesize status transitions');
    assert.ok(content.includes('followUps'), 'Must synthesize progress updates');
    assert.ok(content.includes('filterType'), 'Must support event filtering');
    assert.ok(content.includes('sortOrder'), 'Must support chronological sort ordering');
    assert.ok(content.includes('Zero-PII permanent audit logging'), 'Must state zero-PII audit guarantee');
  });

  await t.test('10. Security, Tenancy Isolation & Privacy Safeguards', () => {
    // 1. Component security & Zero PII persistence checks
    const admissionComponents = [
      'AdmissionStatusBadge.jsx',
      'AdmissionSkeleton.jsx',
      'AdmissionEmptyState.jsx',
      'AdmissionRecordCard.jsx',
      'DepartmentAssignmentModal.jsx',
      'ProgressUpdateModal.jsx',
      'CareProgressWorkspace.jsx',
      'ReferralCompletionModal.jsx',
      'AdmissionHistoryTimeline.jsx'
    ];

    for (const comp of admissionComponents) {
      const compPath = path.join(componentsDir, comp);
      assert.ok(fs.existsSync(compPath), `Component ${comp} must exist`);
      const text = fs.readFileSync(compPath, 'utf8');

      // No persistent localStorage leakage
      assert.ok(!text.includes('localStorage.setItem'), `${comp} must not persist patient data into localStorage`);

      // No raw unmasked console logging of PII
      assert.ok(!text.includes('console.log('), `${comp} must not leave stray console.log statements`);
    }

    // 2. Tenancy enforcement in AdmissionDetailPage & AdmissionsWorkspacePage
    const detailContent = fs.readFileSync(path.join(pagesDir, 'AdmissionDetailPage.jsx'), 'utf8');
    assert.ok(detailContent.includes('destination_facility_id !== user.facilityId'), 'Must enforce destination hospital tenancy');

    // 3. Tenancy isolation in backend referralService
    const backendServicePath = path.join(rootDir, 'backend', 'src', 'services', 'referralService.js');
    assert.ok(fs.existsSync(backendServicePath), 'Backend referralService must exist');
    const backendService = fs.readFileSync(backendServicePath, 'utf8');

    assert.ok(
      backendService.includes('completeReferral') && backendService.includes('destination_facility_id !== userFacilityId'),
      'Backend completeReferral must enforce hospital tenancy isolation'
    );
    assert.ok(
      backendService.includes('closeReferral') && backendService.includes('destination_facility_id !== userFacilityId'),
      'Backend closeReferral must enforce hospital tenancy isolation'
    );
    assert.ok(
      backendService.includes('updateProgress') && backendService.includes('destination_facility_id !== userFacilityId'),
      'Backend updateProgress must enforce hospital tenancy isolation'
    );
  });
});
