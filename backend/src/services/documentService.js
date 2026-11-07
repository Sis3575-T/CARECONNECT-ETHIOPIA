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
  ValidationError
} from '../utils/errors.js';
import {
  ROLES,
  SECURITY_EVENTS,
  DOCUMENT_ACCESS_TYPE,
  DOCUMENT_VERIFICATION_STATUS,
  DOCUMENT_PROCESSING_STATUS
} from '../constants/index.js';

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
  async uploadDocument({ file, metadata, user }) {
    if (!user) {
      throw new ForbiddenError('Authentication required to upload documents');
    }

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

    // Record audit event
    await this.audit.recordEvent({
      eventName: SECURITY_EVENTS.DOCUMENT_UPLOADED,
      category: 'DOCUMENT_MANAGEMENT',
      severity: 'INFO',
      userId: user.userId || user.id,
      facilityId: document.facility_id || user.facilityId,
      details: {
        documentId: document.id,
        documentUuid: document.uuid,
        category: document.document_category,
        fileName: document.file_name,
        fileSizeBytes: document.file_size_bytes,
        referralId: document.referral_id,
        patientId: document.patient_id,
        version: document.version_number
      }
    });

    return document;
  }

  /**
   * Get document metadata with authorization check
   */
  async getDocument(documentId, user) {
    const document = await this.repo.findById(documentId);
    if (!document || document.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    await this.checkDocumentAccess(user, document, 'VIEW');

    // Record access log
    await this.repo.recordAccessLog({
      document_id: document.id,
      accessed_by_user_id: user?.userId || user?.id,
      access_type: DOCUMENT_ACCESS_TYPE.VIEW
    });

    // Strip sensitive internal storage details from response
    return this.sanitizeDocumentResponse(document);
  }

  /**
   * Download or preview document binary with authorization check and streaming
   */
  async getDocumentContent(documentId, user, isPreview = false) {
    const document = await this.repo.findById(documentId);
    if (!document || document.deleted_at) {
      throw new NotFoundError(`Document not found: ${documentId}`);
    }

    await this.checkDocumentAccess(user, document, isPreview ? 'PREVIEW' : 'DOWNLOAD');

    const fileData = await this.storage.getFileBufferForDocument(document.id);

    // Record access log
    await this.repo.recordAccessLog({
      document_id: document.id,
      accessed_by_user_id: user?.userId || user?.id,
      access_type: isPreview ? DOCUMENT_ACCESS_TYPE.PREVIEW : DOCUMENT_ACCESS_TYPE.DOWNLOAD
    });

    // Record security audit
    await this.audit.recordEvent({
      eventName: isPreview ? SECURITY_EVENTS.DOCUMENT_PREVIEWED : SECURITY_EVENTS.DOCUMENT_DOWNLOADED,
      category: 'DOCUMENT_MANAGEMENT',
      severity: 'INFO',
      userId: user?.userId || user?.id,
      facilityId: user?.facilityId || document.facility_id,
      details: {
        documentId: document.id,
        documentUuid: document.uuid,
        fileName: document.file_name,
        category: document.document_category,
        referralId: document.referral_id,
        patientId: document.patient_id,
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
