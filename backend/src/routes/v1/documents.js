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
  getDocumentAccessLogs
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

export default router;
