/**
 * CareConnect Ethiopia - Patient Controller Architecture
 * Exposes patient registration, searching, identity verification, corrections,
 * emergency contacts, and duplicate governance endpoints.
 */

import patientService from '../services/patientService.js';
import { HTTP_STATUS } from '../constants/index.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const registerPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.registerPatient(req.body, req.user);
  return successResponse(res, { patient }, 'Patient registered successfully', HTTP_STATUS.CREATED);
});

export const listPatients = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const results = await patientService.searchPatients(
    {
      limit,
      offset,
      search: req.query.search,
      region: req.query.region,
      woreda: req.query.woreda,
      gender: req.query.gender,
      status: req.query.status
    },
    req.user
  );

  return paginatedResponse(
    res,
    results.data,
    page,
    limit,
    results.total,
    'Patients retrieved successfully'
  );
});

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId, req.user);
  return successResponse(res, { patient }, 'Patient retrieved successfully', HTTP_STATUS.OK);
});

export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.patientId, req.body, req.user);
  return successResponse(res, { patient }, 'Patient record updated successfully', HTTP_STATUS.OK);
});

export const updatePatientStatus = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatientStatus(req.params.patientId, req.body, req.user);
  return successResponse(res, { patient }, 'Patient lifecycle status updated successfully', HTTP_STATUS.OK);
});

export const recordCorrection = asyncHandler(async (req, res) => {
  const correction = await patientService.recordDemographicCorrection(req.params.patientId, req.body, req.user);
  return successResponse(res, { correction }, 'Demographic correction recorded in audit trail', HTTP_STATUS.CREATED);
});

export const getPatientHistory = asyncHandler(async (req, res) => {
  const history = await patientService.getPatientHistory(req.params.patientId, req.user);
  return successResponse(res, history, 'Patient history retrieved successfully', HTTP_STATUS.OK);
});

export const identifyPatients = asyncHandler(async (req, res) => {
  const candidates = await patientService.identifyPatients(req.query, req.user);
  return successResponse(res, { candidates, count: candidates.length }, 'Identification matches computed', HTTP_STATUS.OK);
});

export const getPossibleDuplicates = asyncHandler(async (req, res) => {
  const candidates = await patientService.findPossibleDuplicates(req.params.patientId, req.user);
  return successResponse(res, { candidates, count: candidates.length }, 'Possible duplicate records retrieved', HTTP_STATUS.OK);
});

export const recordDuplicateReview = asyncHandler(async (req, res) => {
  const review = await patientService.recordDuplicateReview(req.params.patientId, req.body, req.user);
  return successResponse(res, { review }, 'Duplicate review outcome recorded successfully', HTTP_STATUS.CREATED);
});

export const submitMergeRequest = asyncHandler(async (req, res) => {
  const mergeReq = await patientService.submitMergeRequest(req.body, req.user);
  return successResponse(res, { mergeRequest: mergeReq }, 'Patient merge request submitted for clinical review', HTTP_STATUS.CREATED);
});

/* =========================================================================
 * EMERGENCY CONTACTS CONTROLLERS
 * ========================================================================= */
export const getEmergencyContacts = asyncHandler(async (req, res) => {
  const contacts = await patientService.getEmergencyContacts(req.params.patientId, req.user);
  return successResponse(res, { contacts }, 'Emergency contacts retrieved successfully', HTTP_STATUS.OK);
});

export const addEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await patientService.addEmergencyContact(req.params.patientId, req.body, req.user);
  return successResponse(res, { contact }, 'Emergency contact added successfully', HTTP_STATUS.CREATED);
});

export const updateEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await patientService.updateEmergencyContact(
    req.params.patientId,
    req.params.contactId,
    req.body,
    req.user
  );
  return successResponse(res, { contact }, 'Emergency contact updated successfully', HTTP_STATUS.OK);
});

export const deleteEmergencyContact = asyncHandler(async (req, res) => {
  await patientService.deleteEmergencyContact(req.params.patientId, req.params.contactId, req.user);
  return successResponse(res, { success: true }, 'Emergency contact deleted successfully', HTTP_STATUS.OK);
});

export default {
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
};
