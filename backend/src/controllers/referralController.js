/**
 * CareConnect Ethiopia - Referral Controller Architecture
 * Exposes digital referral creation, hospital triage workflows, tracking, and arrival management.
 */

import referralService from '../services/referralService.js';
import { HTTP_STATUS } from '../constants/index.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.createReferral(req.body, req.user);
  return successResponse(res, { referral }, 'Referral created successfully', HTTP_STATUS.CREATED);
});

export const listReferrals = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const results = await referralService.searchReferrals(
    {
      limit,
      offset,
      originFacilityId: req.query.originFacilityId,
      destinationFacilityId: req.query.destinationFacilityId,
      patientId: req.query.patientId,
      status: req.query.status,
      priority: req.query.priority,
      search: req.query.search
    },
    req.user
  );

  return paginatedResponse(
    res,
    results.data,
    page,
    limit,
    results.total,
    'Referrals retrieved successfully'
  );
});

export const getReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.getReferralById(req.params.referralId, req.user);
  return successResponse(res, { referral }, 'Referral retrieved successfully', HTTP_STATUS.OK);
});

export const updateReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.update(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral updated successfully', HTTP_STATUS.OK);
});

export const submitReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.submitReferral(req.params.referralId, req.user);
  return successResponse(res, { referral }, 'Referral submitted successfully', HTTP_STATUS.OK);
});

export const cancelReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.cancelReferral(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral cancelled successfully', HTTP_STATUS.OK);
});

export const getIncomingReferrals = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const results = await referralService.getIncomingQueue(req.user, {
    limit,
    offset,
    priority: req.query.priority,
    status: req.query.status,
    search: req.query.search
  });

  return paginatedResponse(
    res,
    results.data,
    page,
    limit,
    results.total,
    'Incoming hospital referrals queue retrieved'
  );
});

export const acknowledgeReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.acknowledgeReferral(
    req.params.referralId,
    req.body.notes,
    req.user
  );
  return successResponse(res, { referral }, 'Referral acknowledged by receiving hospital', HTTP_STATUS.OK);
});

export const acceptReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.acceptReferral(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral accepted by receiving hospital', HTTP_STATUS.OK);
});

export const rejectReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.rejectReferral(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral rejected by receiving hospital', HTTP_STATUS.OK);
});

export const requestInformation = asyncHandler(async (req, res) => {
  const referral = await referralService.requestInformation(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Additional information requested from referring facility', HTTP_STATUS.OK);
});

export const assignHospital = asyncHandler(async (req, res) => {
  const destinationFacilityId = req.body.destination_facility_id || req.body.destinationFacilityId;
  const referral = await referralService.assignHospital(req.params.referralId, destinationFacilityId, req.user);
  return successResponse(res, { referral }, 'Receiving hospital assigned successfully', HTTP_STATUS.OK);
});

export const updatePriority = asyncHandler(async (req, res) => {
  const referral = await referralService.updatePriority(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral triage priority updated', HTTP_STATUS.OK);
});

export const getReferralHistory = asyncHandler(async (req, res) => {
  const referral = await referralService.getReferralById(req.params.referralId, req.user);
  return successResponse(
    res,
    {
      referral_id: referral.id,
      reference_number: referral.reference_number,
      status: referral.status,
      history: referral.status_history || [],
      decisions: referral.decisions || []
    },
    'Referral history retrieved successfully',
    HTTP_STATUS.OK
  );
});

export const getReferralStatus = asyncHandler(async (req, res) => {
  const referral = await referralService.getReferralById(req.params.referralId, req.user);
  return successResponse(
    res,
    {
      referral_id: referral.id,
      reference_number: referral.reference_number,
      status: referral.status,
      priority: referral.priority,
      submitted_at: referral.submitted_at,
      acknowledged_at: referral.acknowledged_at,
      decision_at: referral.decision_at,
      arrived_at: referral.arrived_at
    },
    'Referral status retrieved successfully',
    HTTP_STATUS.OK
  );
});

export const trackByReference = asyncHandler(async (req, res) => {
  const tracked = await referralService.trackByReference(req.params.reference);
  return successResponse(res, { tracking: tracked }, 'Referral tracking details retrieved', HTTP_STATUS.OK);
});

export const confirmArrival = asyncHandler(async (req, res) => {
  const referral = await referralService.confirmArrival(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Patient physical arrival confirmed', HTTP_STATUS.OK);
});

export const updateProgress = asyncHandler(async (req, res) => {
  const referral = await referralService.updateProgress(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Clinical progress updated', HTTP_STATUS.OK);
});

export const completeReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.completeReferral(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Clinical care completed successfully', HTTP_STATUS.OK);
});

export const closeReferral = asyncHandler(async (req, res) => {
  const referral = await referralService.closeReferral(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral closed administratively', HTTP_STATUS.OK);
});

export const recordCorrection = asyncHandler(async (req, res) => {
  const correction = await referralService.recordCorrection(req.params.referralId, req.body, req.user);
  return successResponse(res, { correction }, 'Referral correction recorded in audit trail', HTTP_STATUS.CREATED);
});

export default {
  createReferral,
  listReferrals,
  getReferral,
  updateReferral,
  submitReferral,
  cancelReferral,
  getIncomingReferrals,
  acknowledgeReferral,
  acceptReferral,
  rejectReferral,
  requestInformation,
  assignHospital,
  updatePriority,
  getReferralHistory,
  getReferralStatus,
  trackByReference,
  confirmArrival,
  updateProgress,
  completeReferral,
  closeReferral,
  recordCorrection
};
