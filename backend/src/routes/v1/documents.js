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
  verifyDocument
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

export default router;
