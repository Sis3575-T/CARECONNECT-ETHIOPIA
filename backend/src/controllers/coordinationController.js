/**
 * CareConnect Ethiopia - Referral Coordination Controller
 * Handles HTTP requests for SLA response policies, follow-ups, information requests,
 * reassignments, operational escalations, delay monitoring, and coordination timelines.
 */

import coordinationService from '../services/coordinationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

// ==========================================
// 1. RESPONSE POLICIES (SLAs)
// ==========================================

export const createPolicy = asyncHandler(async (req, res) => {
  const policy = await coordinationService.createPolicy(req.body, req.user);
  return successResponse(res, { policy }, 'Referral response policy created successfully', HTTP_STATUS.CREATED);
});

export const listPolicies = asyncHandler(async (req, res) => {
  const policies = await coordinationService.listPolicies(req.query, req.user);
  return successResponse(res, { policies }, 'Referral response policies retrieved', HTTP_STATUS.OK);
});

export const deactivatePolicy = asyncHandler(async (req, res) => {
  const policy = await coordinationService.deactivatePolicy(req.params.policyId, req.user);
  return successResponse(res, { policy }, 'Referral response policy deactivated', HTTP_STATUS.OK);
});

// ==========================================
// 2. REFERRAL FOLLOW-UPS
// ==========================================

export const recordFollowUp = asyncHandler(async (req, res) => {
  const followUp = await coordinationService.recordFollowUp(req.params.referralId, req.body, req.user);
  return successResponse(res, { follow_up: followUp, followUp }, 'Referral follow-up interaction recorded', HTTP_STATUS.CREATED);
});

export const getFollowUps = asyncHandler(async (req, res) => {
  const followUps = await coordinationService.getFollowUps(req.params.referralId, req.user);
  return successResponse(res, { follow_ups: followUps, followUps }, 'Referral follow-up history retrieved', HTTP_STATUS.OK);
});

// ==========================================
// 3. ADDITIONAL INFORMATION WORKFLOW
// ==========================================

export const createInformationRequest = asyncHandler(async (req, res) => {
  const request = await coordinationService.createInformationRequest(req.params.referralId, req.body, req.user);
  return successResponse(res, { request }, 'Additional information requested by hospital', HTTP_STATUS.CREATED);
});

export const respondToInformationRequest = asyncHandler(async (req, res) => {
  const request = await coordinationService.respondToInformationRequest(req.params.requestId, req.body, req.user);
  return successResponse(res, { request }, 'Additional information submitted by referring health centre', HTTP_STATUS.OK);
});

export const getInfoRequests = asyncHandler(async (req, res) => {
  const requests = await coordinationService.getInfoRequests(req.params.referralId, req.user);
  return successResponse(res, { requests }, 'Information requests retrieved for referral', HTTP_STATUS.OK);
});

// ==========================================
// 4. REFERRAL REASSIGNMENTS
// ==========================================

export const reassignReferral = asyncHandler(async (req, res) => {
  const referral = await coordinationService.reassignReferral(req.params.referralId, req.body, req.user);
  return successResponse(res, { referral }, 'Referral successfully reassigned to new hospital', HTTP_STATUS.OK);
});

export const getReassignments = asyncHandler(async (req, res) => {
  const reassignments = await coordinationService.getReassignments(req.params.referralId, req.user);
  return successResponse(res, { reassignments }, 'Referral reassignment history retrieved', HTTP_STATUS.OK);
});

// ==========================================
// 5. OPERATIONAL ESCALATIONS
// ==========================================

export const createEscalation = asyncHandler(async (req, res) => {
  const referralId = req.params.referralId || req.body.referral_id;
  const escalation = await coordinationService.createEscalation(referralId, req.body, req.user);
  return successResponse(res, { escalation }, 'Operational escalation created', HTTP_STATUS.CREATED);
});

export const resolveEscalation = asyncHandler(async (req, res) => {
  const escalation = await coordinationService.resolveEscalation(req.params.escalationId, req.body, req.user);
  return successResponse(res, { escalation }, 'Operational escalation resolved', HTTP_STATUS.OK);
});

export const listEscalations = asyncHandler(async (req, res) => {
  const escalations = await coordinationService.listEscalations(req.query, req.user);
  return successResponse(res, { escalations }, 'Operational escalations retrieved', HTTP_STATUS.OK);
});

export const getReferralEscalations = asyncHandler(async (req, res) => {
  const escalations = await coordinationService.getEscalations(req.params.referralId, req.user);
  return successResponse(res, { escalations }, 'Escalation history retrieved for referral', HTTP_STATUS.OK);
});

// ==========================================
// 6. DELAYS & EXCEPTIONS
// ==========================================

export const getReferralDelays = asyncHandler(async (req, res) => {
  const delays = await coordinationService.getReferralDelays(req.params.referralId, req.user);
  return successResponse(res, { delays }, 'Referral operational delay measurements retrieved', HTTP_STATUS.OK);
});

export const listExceptions = asyncHandler(async (req, res) => {
  const exceptions = await coordinationService.listExceptions(req.query, req.user);
  return successResponse(res, { exceptions }, 'Referral operational exceptions retrieved', HTTP_STATUS.OK);
});

export const resolveException = asyncHandler(async (req, res) => {
  const exception = await coordinationService.resolveException(req.params.exceptionId, req.body, req.user);
  return successResponse(res, { exception }, 'Referral operational exception resolved', HTTP_STATUS.OK);
});

// ==========================================
// 7. UNIFIED TIMELINE
// ==========================================

export const getReferralTimeline = asyncHandler(async (req, res) => {
  const timeline = await coordinationService.getUnifiedTimeline(req.params.referralId, req.user);
  return successResponse(res, { timeline }, 'Unified referral coordination timeline retrieved', HTTP_STATUS.OK);
});

export default {
  createPolicy,
  listPolicies,
  deactivatePolicy,
  recordFollowUp,
  getFollowUps,
  createInformationRequest,
  respondToInformationRequest,
  getInfoRequests,
  reassignReferral,
  getReassignments,
  createEscalation,
  resolveEscalation,
  listEscalations,
  getReferralEscalations,
  getReferralDelays,
  listExceptions,
  resolveException,
  getReferralTimeline
};
