/**
 * CareConnect Ethiopia - Patient Management Master Router
 * Mounts endpoints for registration, search, duplicate governance, corrections, and emergency contacts.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  registerPatient,
  listPatients,
  getPatient,
  updatePatient,
  updatePatientStatus,
  recordCorrection,
  getPatientHistory,
  identifyPatients,
  getPossibleDuplicates,
  recordDuplicateReview,
  submitMergeRequest,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact
} from '../../controllers/patientController.js';
import {
  listPatientDocuments,
  uploadDocument
} from '../../controllers/documentController.js';
import { uploadSingleDocument } from '../../middleware/upload.js';

const router = Router();

// All patient endpoints require authentication
router.use(authenticate);

// 1. Patient Identification & Candidate Search
router.get('/identify', identifyPatients);

// 2. Submit Merge Request
router.post('/merge-requests', submitMergeRequest);

// 3. Search & List Patients (with facility tenancy isolation)
router.get('/', listPatients);

// 4. Register Patient
router.post('/', registerPatient);

// 5. Get Patient by ID
router.get('/:patientId', getPatient);

// 6. Update Patient Demographics
router.patch('/:patientId', updatePatient);

// 7. Update Patient Lifecycle Status (ACTIVE, INACTIVE, DECEASED, MERGED)
router.patch('/:patientId/status', updatePatientStatus);
router.get('/:patientId/status', async (req, res, next) => {
  // Shortcut to return patient status object
  try {
    const patient = await getPatient(req, res, next);
  } catch (err) {
    next(err);
  }
});

// 8. Patient History (corrections and duplicate review audit trail)
router.get('/:patientId/history', getPatientHistory);

// 9. Demographic Corrections
router.post('/:patientId/corrections', recordCorrection);

// 10. Possible Duplicates for a Specific Patient
router.get('/:patientId/possible-duplicates', getPossibleDuplicates);

// 11. Record Duplicate Review Outcome
router.post('/:patientId/duplicate-review', recordDuplicateReview);

// 12. Emergency Contacts Management
router.get('/:patientId/emergency-contacts', getEmergencyContacts);
router.post('/:patientId/emergency-contacts', addEmergencyContact);
router.patch('/:patientId/emergency-contacts/:contactId', updateEmergencyContact);
router.delete('/:patientId/emergency-contacts/:contactId', deleteEmergencyContact);

// 13. Patient Medical Documents
router.get('/:patientId/documents', listPatientDocuments);
router.post('/:patientId/documents', uploadSingleDocument('file'), (req, res, next) => {
  req.body = req.body || {};
  req.body.patient_id = req.params.patientId;
  return uploadDocument(req, res, next);
});

export default router;
