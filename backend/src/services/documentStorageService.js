/**
 * CareConnect Ethiopia - Document Storage Domain Service
 * High-level orchestration for secure document upload, private persistence,
 * and authorized file retrieval.
 */

import defaultStorageProvider from './storage/index.js';
import documentRepository from '../repositories/documentRepository.js';
import { validateUploadedFile } from '../validators/fileValidator.js';
import { validateDocumentMetadata } from '../validators/documentValidator.js';
import { NotFoundError } from '../utils/errors.js';

export class DocumentStorageService {
  constructor(storageProvider = defaultStorageProvider, repository = documentRepository) {
    this.storage = storageProvider;
    this.repo = repository;
  }

  /**
   * Persist uploaded file to private storage and record database metadata
   */
  async storeDocument({ file, metadata = {}, user = null }) {
    // 1. Server-side validation of file size, MIME type, signature, and extension
    const validatedFile = validateUploadedFile(file);

    // 2. Metadata validation
    const validatedMeta = validateDocumentMetadata(metadata);

    // 3. Write file buffer to private storage engine
    const storageResult = await this.storage.saveFile(validatedFile.storageKey, file.buffer, {
      mimeType: validatedFile.mimeType,
      originalFilename: validatedFile.originalFilename
    });

    // 4. Persist metadata in database
    const documentRecord = await this.repo.create({
      referral_id: validatedMeta.referral_id,
      patient_id: validatedMeta.patient_id,
      facility_id: validatedMeta.facility_id || user?.facilityId || null,
      document_category: validatedMeta.document_category,
      document_type: validatedMeta.document_type,
      file_name: validatedFile.originalFilename,
      file_path: storageResult.storageKey,
      storage_uri: storageResult.storageUri,
      mime_type: validatedFile.mimeType,
      file_size_bytes: validatedFile.fileSizeBytes,
      sha256_checksum: validatedFile.sha256Checksum,
      encryption_status: 'ENCRYPTED_AT_REST',
      uploaded_by_user_id: user?.userId || user?.id || null,
      version_number: 1,
      is_latest: true
    });

    return documentRecord;
  }

  /**
   * Retrieve file stream and metadata for authorized download or preview
   */
  async getFileStreamForDocument(documentId) {
    const doc = await this.repo.findById(documentId);
    if (!doc || doc.deleted_at) {
      throw new NotFoundError(`Document record not found: ${documentId}`);
    }

    const storageKey = doc.file_path || doc.storage_uri.replace(/^private:\/\//, '').replace(/^s3:\/\/[^/]+\//, '');
    const stream = await this.storage.getFileStream(storageKey);

    return {
      document: doc,
      stream,
      mimeType: doc.mime_type,
      fileName: doc.file_name,
      fileSizeBytes: doc.file_size_bytes
    };
  }

  /**
   * Retrieve file buffer for authorized download or preview
   */
  async getFileBufferForDocument(documentId) {
    const doc = await this.repo.findById(documentId);
    if (!doc || doc.deleted_at) {
      throw new NotFoundError(`Document record not found: ${documentId}`);
    }

    const storageKey = doc.file_path || doc.storage_uri.replace(/^private:\/\//, '').replace(/^s3:\/\/[^/]+\//, '');
    const buffer = await this.storage.getFileBuffer(storageKey);

    return {
      document: doc,
      buffer,
      mimeType: doc.mime_type,
      fileName: doc.file_name,
      fileSizeBytes: doc.file_size_bytes
    };
  }

  /**
   * Check if storage object exists
   */
  async fileExists(storageKey) {
    return this.storage.fileExists(storageKey);
  }

  /**
   * Delete underlying file from private storage
   */
  async deleteStoredFile(storageKey) {
    return this.storage.deleteFile(storageKey);
  }
}

export const documentStorageService = new DocumentStorageService();
export default documentStorageService;
