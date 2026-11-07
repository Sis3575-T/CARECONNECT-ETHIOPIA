/**
 * CareConnect Ethiopia - Secure Multer Upload Middleware
 * Intercepts multipart/form-data uploads into memory buffers for server-side validation.
 */

import multer from 'multer';
import config from '../config/env.js';
import { PayloadTooLargeError, BadRequestError } from '../utils/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: config.uploads?.maxFileSizeBytes || 10 * 1024 * 1024,
    files: 1 // Single file attachment per upload request
  }
});

/**
 * Single file upload middleware wrapping multer to catch and format size errors
 */
export function uploadSingleDocument(fieldName = 'file') {
  const multerMiddleware = upload.single(fieldName);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = Math.round((config.uploads?.maxFileSizeBytes || 10 * 1024 * 1024) / (1024 * 1024));
          return next(new PayloadTooLargeError(`Uploaded file exceeds the maximum allowed size of ${maxMb}MB`));
        }
        return next(new BadRequestError(`Upload error: ${err.message}`));
      }
      next();
    });
  };
}

export default {
  uploadSingleDocument
};
