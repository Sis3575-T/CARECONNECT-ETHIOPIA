/**
 * CareConnect Ethiopia - Document HTTP Controller
 * Handles document attachment uploads, metadata queries, and authorized downloads/previews.
 */

import documentService from '../services/documentService.js';
import { successResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../constants/index.js';

function extractRequestContext(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    requestId: req.requestId || req.headers['x-request-id'] || null
  };
}

export async function uploadDocument(req, res, next) {
  try {
    const file = req.file;
    const metadata = req.body;
    const user = req.user;
    const context = extractRequestContext(req);

    const document = await documentService.uploadDocument({ file, metadata, user, context });

    return successResponse(res, document, 'Medical document uploaded and attached successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const user = req.user;
    const context = extractRequestContext(req);

    const document = await documentService.getDocument(documentId, user, context);

    return successResponse(res, document, 'Document metadata retrieved successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function downloadDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const user = req.user;
    const context = extractRequestContext(req);

    const { buffer, mimeType, fileName, fileSizeBytes } = await documentService.getDocumentContent(
      documentId,
      user,
      false,
      context
    );

    // Set secure download headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileSizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function previewDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const user = req.user;
    const context = extractRequestContext(req);

    const { buffer, mimeType, fileName, fileSizeBytes } = await documentService.getDocumentContent(
      documentId,
      user,
      true,
      context
    );

    // Set secure preview headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', fileSizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function listReferralDocuments(req, res, next) {
  try {
    const referralId = req.params.referralId || req.params.id;
    const user = req.user;
    const latestOnly = req.query.latest !== 'false';

    const documents = await documentService.getDocumentsForReferral(referralId, user, { latestOnly });

    return successResponse(res, documents, `Found ${documents.length} referral attachment(s)`, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function listPatientDocuments(req, res, next) {
  try {
    const patientId = req.params.patientId || req.params.id;
    const user = req.user;
    const latestOnly = req.query.latest !== 'false';

    const documents = await documentService.getDocumentsForPatient(patientId, user, { latestOnly });

    return successResponse(res, documents, `Found ${documents.length} patient document(s)`, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function getDocumentAccessLogs(req, res, next) {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const logs = await documentService.getDocumentAccessLogs(documentId, user);

    return successResponse(res, logs, 'Document access logs retrieved', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function replaceVersion(req, res, next) {
  try {
    const { documentId } = req.params;
    const file = req.file;
    const payload = req.body;
    const user = req.user;
    const context = extractRequestContext(req);

    const newVersion = await documentService.replaceDocumentVersion({
      documentId,
      file,
      payload,
      user,
      context
    });

    return successResponse(res, newVersion, 'Document version replaced successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
}

export async function getVersionHistory(req, res, next) {
  try {
    const { documentId } = req.params;
    const user = req.user;
    const context = extractRequestContext(req);

    const history = await documentService.getVersionHistory(documentId, user, context);

    return successResponse(res, history, `Found ${history.length} version(s)`, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function verifyDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const payload = req.body;
    const user = req.user;
    const context = extractRequestContext(req);

    const updated = await documentService.verifyDocument({
      documentId,
      payload,
      user,
      context
    });

    return successResponse(res, updated, 'Document verification outcome recorded', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function archiveDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const { reason } = req.body || {};
    const user = req.user;
    const context = extractRequestContext(req);

    const archived = await documentService.archiveDocument(documentId, user, reason, context);

    return successResponse(res, archived, 'Document archived successfully', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const { documentId } = req.params;
    const reason = req.body?.reason || req.query?.reason;
    const user = req.user;
    const context = extractRequestContext(req);

    const result = await documentService.deleteDocument(documentId, user, reason, context);

    return successResponse(res, result, 'Document record soft-deleted safely', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function queueProcessing(req, res, next) {
  try {
    const { documentId } = req.params;
    const options = req.body || {};
    const user = req.user;
    const context = extractRequestContext(req);

    const result = await documentService.queueDocumentProcessing(documentId, user, options, context);

    return successResponse(res, result, 'Document processing pipeline status updated', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function getProcessingStatus(req, res, next) {
  try {
    const { documentId } = req.params;
    const user = req.user;

    const status = await documentService.getProcessingStatus(documentId, user);

    return successResponse(res, status, 'Document processing status retrieved', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function recordProcessingResult(req, res, next) {
  try {
    const { documentId } = req.params;
    const result = req.body || {};
    const user = req.user;
    const context = extractRequestContext(req);

    const updated = await documentService.recordProcessingResult(documentId, user, result, context);

    return successResponse(res, updated, 'Document processing outcome recorded', HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export default {
  uploadDocument,
  getDocument,
  downloadDocument,
  previewDocument,
  listReferralDocuments,
  listPatientDocuments,
  getDocumentAccessLogs,
  replaceVersion,
  getVersionHistory,
  verifyDocument,
  archiveDocument,
  deleteDocument,
  queueProcessing,
  getProcessingStatus,
  recordProcessingResult
};
