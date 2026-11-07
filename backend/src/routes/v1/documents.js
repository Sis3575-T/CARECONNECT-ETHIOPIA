/**
 * CareConnect Ethiopia - Document API Router
 * Endpoints for secure medical document uploads, preview, download, and versioning.
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { uploadSingleDocument } from '../../middleware/upload.js';
import {
  uploadDocument,
  getDocument,
  downloadDocument,
  previewDocument,
  getDocumentAccessLogs,
  replaceVersion,
  getVersionHistory,
  verifyDocument,
  archiveDocument,
  deleteDocument,
  queueProcessing,
  getProcessingStatus,
  recordProcessingResult
} from '../../controllers/documentController.js';

const router = Router();

// All document routes require authentication
router.use(authenticate);

// 1. Upload new document attachment
router.post('/', uploadSingleDocument('file'), uploadDocument);

// 2. Get document metadata
router.get('/:documentId', getDocument);

// 3. Download document binary attachment
router.get('/:documentId/download', downloadDocument);

// 4. Preview document inline
router.get('/:documentId/preview', previewDocument);

// 5. Query document access logs
router.get('/:documentId/logs', getDocumentAccessLogs);

// 6. Replace document version
router.post('/:documentId/replace', uploadSingleDocument('file'), replaceVersion);

// 7. Get document version history
router.get('/:documentId/versions', getVersionHistory);

// 8. Human-controlled document verification review
router.post('/:documentId/verify', verifyDocument);

// 9. Document Archival (non-destructive lifecycle transition)
router.post('/:documentId/archive', archiveDocument);

// 10. Document Soft Deletion (requires reason and permission)
router.delete('/:documentId', deleteDocument);

// 11. AI/OCR Processing Preparation: Query pipeline status
router.get('/:documentId/processing', getProcessingStatus);

// 12. AI/OCR Processing Preparation: Queue processing job (idempotent)
router.post('/:documentId/processing/queue', queueProcessing);

// 13. AI/OCR Processing Preparation: Record processing result
router.post('/:documentId/processing/complete', recordProcessingResult);

export default router;
