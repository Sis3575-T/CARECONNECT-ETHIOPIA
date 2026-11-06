/**
 * CareConnect Ethiopia - Referral Router
 * Mounts endpoints for referral creation, submission, hospital triage, tracking, and operational completion.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
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
} from '../../controllers/referralController.js';

const router = Router();

// 1. Reference Tracking (Available publicly or authenticated; zero sensitive clinical text)
router.get('/track/:reference', trackByReference);

// All subsequent referral endpoints require authentication
router.use(authenticate);

// 2. Incoming Referrals Queue for Hospital Staff
router.get('/incoming', getIncomingReferrals);

// 3. Search & List Referrals
router.get('/', listReferrals);

// 4. Create Referral
router.post('/', createReferral);

// 5. Get Referral by ID
router.get('/:referralId', getReferral);

// 6. Update Referral Details (Draft status)
router.patch('/:referralId', updateReferral);

// 7. Submit Referral
router.post('/:referralId/submit', submitReferral);

// 8. Cancel Referral
router.post('/:referralId/cancel', cancelReferral);

// 9. Hospital Triage Workflow
router.post('/:referralId/acknowledge', acknowledgeReferral);
router.post('/:referralId/accept', acceptReferral);
router.post('/:referralId/reject', rejectReferral);
router.post('/:referralId/request-information', requestInformation);

// 10. Receiving Hospital Assignment & Priority Management
router.post('/:referralId/assign', assignHospital);
router.patch('/:referralId/priority', updatePriority);

// 11. Tracking & History Inquiries
router.get('/:referralId/history', getReferralHistory);
router.get('/:referralId/status', getReferralStatus);

// 12. Arrival & Operational Progress
router.post('/:referralId/arrival', confirmArrival);
router.post('/:referralId/progress', updateProgress);
router.post('/:referralId/complete', completeReferral);
router.post('/:referralId/close', closeReferral);

// 13. Clinical Corrections
router.post('/:referralId/corrections', recordCorrection);

export default router;
