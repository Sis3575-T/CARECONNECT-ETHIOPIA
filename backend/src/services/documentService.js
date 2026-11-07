/**
 * CareConnect Ethiopia - Core Document Management & Authorization Service
 * Enforces facility tenancy, referral boundaries, and RBAC rules for medical attachments.
 */

import documentRepository from '../repositories/documentRepository.js';
import referralRepository from '../repositories/referralRepository.js';
import patientRepository from '../repositories/patientRepository.js';
import documentStorageService from './documentStorageService.js';
import securityAuditService from './securityAuditService.js';
import {
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  ConflictError
} from '../utils/errors.js';
import {
  ROLES,
  SECURITY_EVENTS,
  DOCUMENT_ACCESS_TYPE,
  DOCUMENT_VERIFICATION_STATUS,
  DOCUMENT_PROCESSING_STATUS
} from '../constants/index.js';
import { validateDocumentReplacement, validateDocumentVerification } from '../validators/documentValidator.js';
import { validateUploadedFile } from '../validators/fileValidator.js';

export class DocumentService {
  constructor(
    repo = documentRepository,
    storage = documentStorageService,
    refRepo = referralRepository,
    patRepo = patientRepository,
    audit = securityAuditService
  ) {
    this.repo = repo;
    this.storage = storage;
    this.refRepo = refRepo;
    this.patRepo = patRepo;
    this.audit = audit;
  }

  /**
   * Enforces backend authorization rules for document access:
   * - Health Centre staff: access documents for patients/referrals originating from or assigned to their facility.
   * - Hospital staff: access documents associated with referrals directed to/received by their hospital.
   * - Transport staff: explicitly forbidden from clinical documents.
   * - System Administrators: forbidden from direct clinical content view/download without justified clinical permission.
   */
  async checkDocumentAccess(user, document, action = 'VIEW') {
    if (!user) {
      throw new ForbiddenError('Authentication required to access medical documents');
    }

    const roleName = user.roleName;
    const roleId = Number(user.roleId);
    const userFacilityId = user.facilityId;

    // 1. Transport staff (COORDINATOR or DRIVER) must NEVER access clinical documents
    if (
      roleName === ROLES.TRANSPORT_COORDINATOR ||
      roleName === ROLES.AMBULANCE_DRIVER ||
      roleId === 4 ||
      roleId === 5
    ) {
      throw new ForbiddenError('Transport coordinators and drivers are not authorized to view clinical documents');
    }

    // 2. Administrators must NOT automatically receive unrestricted access to clinical documents
    if (roleName === ROLES.SYSTEM_ADMINISTRATOR || roleId === 6) {
      // Allow metadata inspection if viewing metadata, but block clinical download/preview
      if (action === 'DOWNLOAD' || action === 'PREVIEW' || action === 'VIEW_CONTENT') {
        throw new ForbiddenError('Administrators are restricted from direct access to confidential patient medical documents');
      }
    }

    // 3. Look up referral context if document is linked to a referral
    let referral = null;
    if (document.referral_id) {
      referral = await this.refRepo.findById(document.referral_id);
    }

    // 4. Look up patient context if document is linked to a patient
    let patient = null;
    if (document.patient_id) {
      patient = await this.patRepo.findById(document.patient_id);
    }

    // 5. Health Centre Staff Access Rules
    if (roleName === ROLES.HEALTH_CENTRE_STAFF || roleId === 1) {
      const isOriginFacility = userFacilityId && (
        userFacilityId === document.facility_id ||
        (referral && referral.origin_facility_id === userFacilityId) ||
        (patient && patient.registered_facility_id === userFacilityId)
      );

      if (!isOriginFacility) {
        throw new ForbiddenError('Health centre staff can only access documents originating from or assigned to their facility');
      }
      return true;
    }

    // 6. Hospital Staff Access Rules
    if (
      roleName === ROLES.HOSPITAL_STAFF ||
      roleName === ROLES.HOSPITAL_TRIAGE ||
      roleId === 2 ||
      roleId === 3
    ) {
      const isDestinationFacility = userFacilityId && (
        (referral && referral.destination_facility_id === userFacilityId) ||
        userFacilityId === document.facility_id ||
        (referral && referral.origin_facility_id === userFacilityId)
      );

      if (!isDestinationFacility) {
        throw new ForbiddenError('Hospital staff can only access documents for referrals assigned to their hospital');
      }
      return true;
    }

    // 7. Regional Officer Access Rules (Audit / Read-only within region)
    if (roleName === ROLES.REGIONAL_OFFICER || roleId === 7) {
      return true;
    }

    return true;
  }

  /**
   * Upload and persist a medical document
   */
  async uploadDocument({ file, metadata, user, context = {} }) {
    if (!user) {
      throw new ForbiddenError('Authentication required to upload documents');
    }

    const { ipAddress = '127.0.0.1', userAgent = 'Unknown', requestId = null } = context;

    // Transport staff cannot upload clinical attachments
    if (user.roleId === 4 || user.roleId === 5 || user.roleName === ROLES.TRANSPORT_COORDINATOR) {
      throw new ForbiddenError('Transport coordinators cannot upload medical documents');
    }

    // Validate referral context if provided
    let referral = null;
    if (metadata.referral_id) {
      referral = await this.refRepo.findById(metadata.referral_id);
      if (!referral) {
        throw new NotFoundError(`Referral not found: ${metadata.referral_id}`);
      }

      // Health centre staff can only upload to referrals originating from their facility
      if (user.roleId === 1 && referral.origin_facility_id && user.facilityId !== referral.origin_facility_id) {
        throw new ForbiddenError('Cannot upload documents to referrals outside your facility');
      }

      // Hospital staff can only upload if assigned or receiving
      if ((user.roleId === 2 || user.roleId === 3) && user.facilityId) {
        const canHospitalUpload = referral.destination_facility_id === user.facilityId || referral.origin_facility_id === user.facilityId;
        if (!canHospitalUpload) {
          throw new ForbiddenError('Hospital clinicians can only attach documents to assigned referrals');
        }
      }

      if (!metadata.patient_id && referral.patient_id) {
        metadata.patient_id = referral.patient_id;
      }
    }

    // Validate patient context if provided
    if (metadata.patient_id) {
      const patient = await this.patRepo.findById(metadata.patient_id);
      if (!patient) {
        throw new NotFoundError(`Patient not found: ${metadata.patient_id}`);
      }
      if (user.roleId === 1 && patient.registered_facility_id && user.facilityId !== patient.registered_facility_id) {
        throw new ForbiddenError('Cannot upload documents for patients registered at other facilities');
      }
    }

    // Persist document to storage and database
    const document = await this.storage.storeDocument({
      file,
      metadata,
      user
    });

    // Record access log
    await this.repo.recordAccessLog({
      document_id: document.id,
      accessed_by_user_id: user?.userId || user?.id,
      access_type: DOCUMENT_ACCESS_TYPE.UPLOAD,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Record audit event
    await this.audit.recordDocumentAccess({
      eventName: SECURITY_EVENTS.DOCUMENT_UPLOADED,
      documentId: document.id,
      documentUuid: document.uuid,
      userId: user.userId || user.id,
      facilityId: document.facility_id || user.facilityId,
      referralId: document.referral_id,
      patientId: document.patient_id,
      ipAddress,
      userAgent,
      requestId,
      details: {
        category: document.document_category,
        fileName: document.file_name,
        fileSizeBytes: document.file_size_bytes,
        version: document.version_number
      }
    });

    return document;
  }

  /**
   * Get document metadata with authorization check
   */
  async getDocument(documentId, user, context = {}) {
    const document = await this.repo.findById(documentId);
    if (!document || document.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    await this.checkDocumentAccess(user, document, 'VIEW');

    const { ipAddress = '127.0.0.1', userAgent = 'Unknown', requestId = null } = context;

    // Record access log
    await this.repo.recordAccessLog({
      document_id: document.id,
      accessed_by_user_id: user?.userId || user?.id,
      access_type: DOCUMENT_ACCESS_TYPE.VIEW,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Record audit event
    await this.audit.recordDocumentAccess({
      eventName: SECURITY_EVENTS.DOCUMENT_VIEWED,
      documentId: document.id,
      documentUuid: document.uuid,
      userId: user?.userId || user?.id,
      facilityId: user?.facilityId || document.facility_id,
      referralId: document.referral_id,
      patientId: document.patient_id,
      ipAddress,
      userAgent,
      requestId,
      details: {
        category: document.document_category,
        fileName: document.file_name
      }
    });

    // Strip sensitive internal storage details from response
    return this.sanitizeDocumentResponse(document);
  }

  /**
   * Download or preview document binary with authorization check and streaming
   */
  async getDocumentContent(documentId, user, isPreview = false, context = {}) {
    const document = await this.repo.findById(documentId);
    if (!document || document.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    await this.checkDocumentAccess(user, document, isPreview ? 'PREVIEW' : 'DOWNLOAD');

    const fileData = await this.storage.getFileBufferForDocument(document.id);
    const { ipAddress = '127.0.0.1', userAgent = 'Unknown', requestId = null } = context;

    // Record access log
    await this.repo.recordAccessLog({
      document_id: document.id,
      accessed_by_user_id: user?.userId || user?.id,
      access_type: isPreview ? DOCUMENT_ACCESS_TYPE.PREVIEW : DOCUMENT_ACCESS_TYPE.DOWNLOAD,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    // Record security audit
    await this.audit.recordDocumentAccess({
      eventName: isPreview ? SECURITY_EVENTS.DOCUMENT_PREVIEWED : SECURITY_EVENTS.DOCUMENT_DOWNLOADED,
      documentId: document.id,
      documentUuid: document.uuid,
      userId: user?.userId || user?.id,
      facilityId: user?.facilityId || document.facility_id,
      referralId: document.referral_id,
      patientId: document.patient_id,
      ipAddress,
      userAgent,
      requestId,
      details: {
        fileName: document.file_name,
        category: document.document_category,
        accessType: isPreview ? 'PREVIEW' : 'DOWNLOAD'
      }
    });

    return {
      document: this.sanitizeDocumentResponse(document),
      buffer: fileData.buffer,
      mimeType: document.mime_type,
      fileName: document.file_name,
      fileSizeBytes: document.file_size_bytes
    };
  }

  /**
   * List documents for a referral
   */
  async getDocumentsForReferral(referralId, user, options = {}) {
    const referral = await this.refRepo.findById(referralId);
    if (!referral) {
      throw new NotFoundError(`Referral not found: ${referralId}`);
    }

    // Validate user access to this referral
    if (user.roleName === ROLES.TRANSPORT_COORDINATOR || user.roleId === 4 || user.roleId === 5) {
      throw new ForbiddenError('Transport coordinators cannot access referral medical attachments');
    }

    if (user.roleId === 1 && user.facilityId && referral.origin_facility_id !== user.facilityId) {
      throw new ForbiddenError('Cannot access documents of referrals outside your facility');
    }

    if ((user.roleId === 2 || user.roleId === 3) && user.facilityId) {
      if (referral.destination_facility_id !== user.facilityId && referral.origin_facility_id !== user.facilityId) {
        throw new ForbiddenError('Cannot access documents of referrals not assigned to your hospital');
      }
    }

    const docs = await this.repo.findByReferralId(referralId, options);
    return docs.map(d => this.sanitizeDocumentResponse(d));
  }

  /**
   * List documents for a patient
   */
  async getDocumentsForPatient(patientId, user, options = {}) {
    const patient = await this.patRepo.findById(patientId);
    if (!patient) {
      throw new NotFoundError(`Patient not found: ${patientId}`);
    }

    if (user.roleName === ROLES.TRANSPORT_COORDINATOR || user.roleId === 4 || user.roleId === 5) {
      throw new ForbiddenError('Transport coordinators cannot access patient medical documents');
    }

    if (user.roleId === 1 && user.facilityId && patient.registered_facility_id !== user.facilityId) {
      throw new ForbiddenError('Cannot access documents of patients registered at other facilities');
    }

    const docs = await this.repo.findByPatientId(patientId, options);
    return docs.map(d => this.sanitizeDocumentResponse(d));
  }

  /**
   * Get document access audit history
   */
  async getDocumentAccessLogs(documentId, user) {
    const doc = await this.repo.findById(documentId);
    if (!doc) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    // Only facility staff associated with document or admins/regional officers can view audit trail
    if (user.roleId !== 6 && user.roleId !== 7 && user.facilityId !== doc.facility_id) {
      throw new ForbiddenError('Not authorized to view access logs for this document');
    }

    return this.repo.getAccessLogs(doc.id);
  }

  /**
   * Replace document version with optimistic concurrency check
   */
  async replaceDocumentVersion({ documentId, file, payload = {}, user }) {
    if (!user) {
      throw new ForbiddenError('Authentication required to upload replacement document');
    }

    const existingDoc = await this.repo.findById(documentId);
    if (!existingDoc || existingDoc.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    // Tenancy / permission check
    await this.checkDocumentAccess(user, existingDoc, 'UPLOAD');

    // Optimistic Concurrency Check: Only the latest version can be replaced
    if (!existingDoc.is_latest) {
      throw new ConflictError(
        `Concurrent replacement conflict: Document version ${existingDoc.version_number} has already been replaced by a newer version.`
      );
    }

    // Validate replacement parameters
    const validatedRepl = validateDocumentReplacement(payload);

    // Validate uploaded file
    const validatedFile = validateUploadedFile(file);

    // Save to private storage
    const storageResult = await this.storage.storage.saveFile(validatedFile.storageKey, file.buffer, {
      mimeType: validatedFile.mimeType,
      originalFilename: validatedFile.originalFilename
    });

    // Create new version in repository
    const newVersion = await this.repo.replaceVersion(existingDoc, {
      file_name: validatedFile.originalFilename,
      file_path: storageResult.storageKey,
      storage_uri: storageResult.storageUri,
      mime_type: validatedFile.mimeType,
      file_size_bytes: validatedFile.fileSizeBytes,
      sha256_checksum: validatedFile.sha256Checksum,
      uploaded_by_user_id: user?.userId || user?.id,
      replacement_reason: validatedRepl.replacement_reason,
      document_category: validatedRepl.document_category || existingDoc.document_category,
      verification_status: DOCUMENT_VERIFICATION_STATUS.UPLOADED
    });

    // Record audit event
    await this.audit.recordDocumentAccess({
      eventName: SECURITY_EVENTS.DOCUMENT_REPLACED,
      documentId: newVersion.id,
      documentUuid: newVersion.uuid,
      userId: user?.userId || user?.id,
      facilityId: existingDoc.facility_id || user.facilityId,
      referralId: existingDoc.referral_id,
      patientId: existingDoc.patient_id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      details: {
        documentGroupId: existingDoc.document_group_id,
        previousDocumentId: existingDoc.id,
        previousVersion: existingDoc.version_number,
        newVersion: newVersion.version_number,
        replacementReason: validatedRepl.replacement_reason
      }
    });

    return this.sanitizeDocumentResponse(newVersion);
  }

  /**
   * Retrieve version history for a document group
   */
  async getVersionHistory(documentId, user, context = {}) {
    const doc = await this.repo.findById(documentId);
    if (!doc || doc.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    await this.checkDocumentAccess(user, doc, 'VIEW');

    const history = await this.repo.getVersionHistory(doc.document_group_id || doc.uuid);
    return history.map(d => this.sanitizeDocumentResponse(d));
  }

  /**
   * Human-controlled document verification transition
   */
  async verifyDocument({ documentId, payload = {}, user, context = {} }) {
    if (!user) {
      throw new ForbiddenError('Authentication required to verify document');
    }

    const doc = await this.repo.findById(documentId);
    if (!doc || doc.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    // Transport staff cannot perform clinical verification
    if (user.roleId === 4 || user.roleId === 5 || user.roleName === ROLES.TRANSPORT_COORDINATOR) {
      throw new ForbiddenError('Transport coordinators are not authorized to verify medical documents');
    }

    // Check document access
    await this.checkDocumentAccess(user, doc, 'VERIFY');

    // Validate review payload
    const validated = validateDocumentVerification(payload);

    const now = new Date().toISOString();
    const updates = {
      verification_status: validated.status,
      verified_by_user_id: user?.userId || user?.id,
      verified_at: now,
      verification_notes: validated.verification_notes || null,
      rejection_reason: validated.rejection_reason || null
    };

    const updated = await this.repo.update(doc.id, updates);

    // Map security event
    let eventName = SECURITY_EVENTS.DOCUMENT_VERIFIED;
    if (validated.status === DOCUMENT_VERIFICATION_STATUS.REJECTED) {
      eventName = SECURITY_EVENTS.DOCUMENT_REJECTED;
    } else if (validated.status === DOCUMENT_VERIFICATION_STATUS.REQUIRES_CORRECTION) {
      eventName = SECURITY_EVENTS.DOCUMENT_CORRECTION_REQUESTED;
    }

    await this.audit.recordDocumentAccess({
      eventName,
      documentId: doc.id,
      documentUuid: doc.uuid,
      userId: user?.userId || user?.id,
      facilityId: doc.facility_id || user.facilityId,
      referralId: doc.referral_id,
      patientId: doc.patient_id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      severity: validated.status === DOCUMENT_VERIFICATION_STATUS.REJECTED ? 'WARNING' : 'INFO',
      details: {
        verificationStatus: validated.status,
        rejectionReason: validated.rejection_reason,
        verificationNotes: validated.verification_notes
      }
    });

    const response = this.sanitizeDocumentResponse(updated);
    response.verification_disclaimer =
      'Administrative review confirmation only. Verification confirms procedural review compliance, not definitive clinical diagnosis.';

    return response;
  }

  /**
   * Sanitize document object before returning to client (hide absolute disk paths)
   */
  sanitizeDocumentResponse(doc) {
    if (!doc) return null;
    const sanitized = { ...doc };
    // Remove internal disk path
    delete sanitized.file_path;
    // Hide raw database primary key if UUID is preferred, or retain both safely
    return sanitized;
  }
}

export const documentService = new DocumentService();
export default documentService;
