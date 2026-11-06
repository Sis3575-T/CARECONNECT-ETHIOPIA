/**
 * CareConnect Ethiopia - Patient Controller Architecture
 * Exposes patient registration, searching, identity verification, corrections,
 * emergency contacts, and duplicate governance endpoints.
 */

import patientService from '../services/patientService.js';
import { HTTP_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const registerPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.registerPatient(req.body, req.user);
  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Patient registered successfully',
    data: patient
  });
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

  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: results.data,
    pagination: {
      total: results.total,
      page,
      limit,
      totalPages: Math.ceil(results.total / limit) || 1
    }
  });
});

export const getPatient = asyncHandler(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: patient
  });
});

export const updatePatient = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatient(req.params.patientId, req.body, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Patient record updated successfully',
    data: patient
  });
});

export const updatePatientStatus = asyncHandler(async (req, res) => {
  const patient = await patientService.updatePatientStatus(req.params.patientId, req.body, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Patient lifecycle status updated successfully',
    data: patient
  });
});

export const recordCorrection = asyncHandler(async (req, res) => {
  const correction = await patientService.recordDemographicCorrection(req.params.patientId, req.body, req.user);
  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Demographic correction recorded in audit trail',
    data: correction
  });
});

export const getPatientHistory = asyncHandler(async (req, res) => {
  const history = await patientService.getPatientHistory(req.params.patientId, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: history
  });
});

export const identifyPatients = asyncHandler(async (req, res) => {
  const candidates = await patientService.identifyPatients(req.query, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    count: candidates.length,
    data: candidates
  });
});

export const getPossibleDuplicates = asyncHandler(async (req, res) => {
  const candidates = await patientService.findPossibleDuplicates(req.params.patientId, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    count: candidates.length,
    data: candidates
  });
});

export const recordDuplicateReview = asyncHandler(async (req, res) => {
  const review = await patientService.recordDuplicateReview(req.params.patientId, req.body, req.user);
  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Duplicate review outcome recorded successfully',
    data: review
  });
});

export const submitMergeRequest = asyncHandler(async (req, res) => {
  const mergeReq = await patientService.submitMergeRequest(req.body, req.user);
  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Patient merge request submitted for clinical review',
    data: mergeReq
  });
});

/* =========================================================================
 * EMERGENCY CONTACTS CONTROLLERS
 * ========================================================================= */
export const getEmergencyContacts = asyncHandler(async (req, res) => {
  const contacts = await patientService.getEmergencyContacts(req.params.patientId, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    data: contacts
  });
});

export const addEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await patientService.addEmergencyContact(req.params.patientId, req.body, req.user);
  res.status(HTTP_STATUS.CREATED).json({
    status: 'success',
    message: 'Emergency contact added successfully',
    data: contact
  });
});

export const updateEmergencyContact = asyncHandler(async (req, res) => {
  const contact = await patientService.updateEmergencyContact(
    req.params.patientId,
    req.params.contactId,
    req.body,
    req.user
  );
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Emergency contact updated successfully',
    data: contact
  });
});

export const deleteEmergencyContact = asyncHandler(async (req, res) => {
  await patientService.deleteEmergencyContact(req.params.patientId, req.params.contactId, req.user);
  res.status(HTTP_STATUS.OK).json({
    status: 'success',
    message: 'Emergency contact deleted successfully'
  });
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
