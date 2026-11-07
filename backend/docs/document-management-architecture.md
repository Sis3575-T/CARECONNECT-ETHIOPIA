# CareConnect Ethiopia — Secure Document Management Architecture

## 1. Executive Summary & Domain Scope

CareConnect Ethiopia implements a multi-tier, private document management and medical attachment subsystem designed specifically for national healthcare referral coordination. The document management subsystem supports:

- **Medical Referral Attachments**: Paper referral slips, laboratory panels, diagnostic imaging reports, discharge summaries, and prescription records.
- **Patient Document Registry**: Standalone clinical records attached directly to patient profiles.
- **Server-Side Security Validation**: File size, strict MIME typing, extension checks, and magic byte signature verification.
- **Private Storage Abstraction**: Isolation outside public web roots with transparent switching between Local Private Disk Storage and S3-Compatible Object Storage (MinIO, Ceph, AWS S3).
- **Controlled Versioning**: Immutable historical record preservation with optimistic concurrency control.
- **Human-Controlled Verification Workflows**: Formal review state transitions explicitly distinguishing administrative verification from clinical diagnosis.
- **Granular Access Control & Multi-Facility Isolation**: Strict facility tenancy enforcement preventing cross-facility data leakage, blocking transport coordinators from clinical text, and preventing administrative privilege escalation.
- **Immutable Privacy & Security Auditing**: Full access tracking (`VIEW`, `DOWNLOAD`, `PREVIEW`, `UPLOAD`, `REPLACE`, `VERIFY`, `ARCHIVE`, `DELETE`) with automatic redaction of clinical text and credentials.
- **Asynchronous AI/OCR Preparation**: Pipeline job abstraction supporting idempotency, duplicate job prevention, and retry counters without automated clinical decision-making.

---

## 2. Supported Document Categories

| Category Code | Display Name | Clinical Purpose |
| :--- | :--- | :--- |
| `REFERRAL_LETTER` | Referral Letter / Slip | Primary clinical referral documentation from originating health post or health centre. |
| `LAB_RESULT` | Laboratory Report | Hematology, biochemistry, microbiology, or pathology results. |
| `IMAGING_REPORT` | Imaging / Radiology Report | X-Ray, Ultrasound, CT, or MRI reports and annotated scans. |
| `PRESCRIPTION` | Prescription Record | Historical medication records, active regimens, or emergency medication orders. |
| `DISCHARGE_SUMMARY` | Discharge Summary | Inpatient summary or emergency room discharge records from previous admissions. |
| `MEDICAL_HISTORY` | Medical History Document | Longitudinal baseline, chronic illness cards, or immunization certificates. |
| `CLINICAL_ASSESSMENT` | Clinical Assessment | Specialist consultation notes or emergency triage assessments. |
| `CONSENT_DOCUMENT` | Consent Document | Signed informed consent forms or legal guardian authorizations. |
| `OTHER` | Supporting Document | Other relevant administrative or clinical attachments. |

---

## 3. Server-Side Upload Validation & Security Engine

Client-supplied headers and MIME types are never trusted. The server enforces a multi-phase validation pipeline:

```
[Upload Request (Multipart)]
          │
          ▼
1. File Existence & Size Check (Max configurable limit, default 10MB)
          │
          ▼
2. Filename Path Traversal Sanitization (Strip ../, ..\, null bytes, control chars)
          │
          ▼
3. Extension Blacklist & Whitelist Inspection
   - Whitelist: .pdf, .jpg, .jpeg, .png
   - Blacklist: .exe, .sh, .bat, .cmd, .js, .py, .php, .msi, double extensions (.pdf.exe)
          │
          ▼
4. Magic Byte / File Signature Validation
   - PDF:  %PDF- (0x25 0x50 0x44 0x46)
   - JPEG: 0xFF 0xD8 0xFF
   - PNG:  0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
          │
          ▼
5. Cross-Check: Declared MIME Type == Magic Byte Signature == File Extension
          │
          ▼
6. Cryptographic Digest Calculation: SHA-256 Checksum
          │
          ▼
7. Unguessable Safe Storage Key Generation: docs/{YYYY}/{MM}/{UUID}.{ext}
```

---

## 4. Storage Provider Architecture

The storage architecture implements a provider interface abstraction (`StorageProvider`) decoupling business services from storage implementations:

### 4.1 Local Private Disk Storage (`LocalStorageProvider`)
- **Default for Development**: Files are written to a secure private directory (`backend/uploads/private_documents/` or `STORAGE_LOCAL_DIR`).
- **Isolation**: Stored outside public web directories; files are never mapped to public Express static routes.
- **Directory Permissions**: Folders created with mode `0700` and files with mode `0600`.
- **Path Traversal Guard**: All storage keys are resolved relative to the configured root and rejected if path traversal sequences attempt to escape the root boundary.

### 4.2 S3-Compatible Object Storage (`S3StorageProvider`)
- **Deployment Ready**: Fully supports MinIO, Ceph, and AWS S3 object storage.
- **Private Access Control**: Bucket configured as private with zero public read ACLs.
- **In-Memory Mock Fallback**: Automatic mock storage fallback enables comprehensive test suite execution in offline or CI environments without requiring active cloud credentials.

---

## 5. Authorization & Multi-Facility Access Control

| User Role | View Metadata | Download / Preview | Upload Attachment | Replace Version | Verify Document | Delete / Archive |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Health Centre Staff** | Yes (Own facility/referral) | Yes (Own facility/referral) | Yes (Own facility/referral) | Yes (Own facility/referral) | Yes (Own facility/referral) | Yes (Archival only) |
| **Hospital Staff / Triage** | Yes (Assigned referral) | Yes (Assigned referral) | Yes (Assigned referral) | Yes (Assigned referral) | Yes (Assigned referral) | No |
| **Transport Coordinator / Driver** | **NO (403)** | **NO (403)** | **NO (403)** | **NO (403)** | **NO (403)** | **NO (403)** |
| **System Administrator** | Yes (Metadata & logs) | **NO (403)** *(Clinical access restriction)* | No | No | No | Yes (Controlled soft-delete) |
| **Cross-Facility Clinician** | **NO (403)** | **NO (403)** | **NO (403)** | **NO (403)** | **NO (403)** | **NO (403)** |

### Strict Operational Safeguards:
1. **Transport Isolation**: Paramedics and fleet coordinators are strictly denied access to clinical attachments. Their workflow operates on transit milestones and delay reports, not patient medical history.
2. **Administrative Clinical Restriction**: System administrators cannot download or preview patient medical records without explicit clinical roles, preserving constitutional privacy boundaries.
3. **Cross-Facility Tenancy**: Clinicians at Hospital B cannot view, preview, or download attachments belonging to referrals between Health Centre A and Hospital C.

---

## 6. Secure Download and Preview Mechanics

Documents are never served as static assets. Every download or preview request passes through authentication and tenancy authorization:

- **Download Endpoint** (`GET /api/v1/documents/:id/download`):
  - Streams binary with `Content-Disposition: attachment; filename="<sanitized_name>"`.
- **Preview Endpoint** (`GET /api/v1/documents/:id/preview`):
  - Streams binary with `Content-Disposition: inline; filename="<sanitized_name>"`.
- **Enforced Security Headers**:
  - `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing exploits).
  - `Cache-Control: no-store, no-cache, must-revalidate, private` (Prevents intermediate caching of sensitive medical scans).
  - `Pragma: no-cache`
  - `Expires: 0`

---

## 7. Document Versioning & Replacement

Medical attachments are immutable once created. When a document requires correction:

1. **Version Lineage**: Each document group shares a unique `document_group_id`.
2. **Optimistic Concurrency**: The system checks `is_latest === true` on the version being replaced. If another user uploaded a newer version concurrently, the request is rejected with `409 Conflict`.
3. **Historical Preservation**: The existing version is marked `is_latest = false`. A new version record is inserted with `version_number = previous + 1` and `parent_document_id = previous.id`.
4. **Mandatory Justification**: The replacement requires a non-empty `replacement_reason`.
5. **Lineage Inquiries**: Authorized users can inspect the complete version history via `GET /api/v1/documents/:id/versions`.

---

## 8. Verification Workflow & Clinical Disclaimer

The verification lifecycle is strictly human-controlled:

- **Statuses**: `UPLOADED` -> `PENDING_REVIEW` -> `VERIFIED` | `REJECTED` | `REQUIRES_CORRECTION` -> `ARCHIVED`.
- **Rejection Integrity**: Marking a document `REJECTED` requires a mandatory `rejection_reason`.
- **Correction Requests**: Marking a document `REQUIRES_CORRECTION` requires specific `verification_notes`.
- **Crucial Ethical Guardrail**: Document verification confirms procedural review compliance only (e.g., scan quality, presence of signature, matching patient MRN). It **never constitutes definitive clinical diagnosis**. AI systems are prohibited from automatically marking clinical documents as verified.

---

## 9. Preparation for Future AI & OCR Processing

The document management system prepares medical attachments for future artificial intelligence and optical character recognition pipelines:

### Planned Pipeline Stages:
1. `file_validation`: Magic byte, checksum, and format verification.
2. `document_classification`: Categorization into referral slips, lab forms, or imaging.
3. `ocr_extraction`: Amharic and English text recognition.
4. `text_normalization`: Ethiopian date conversion and clinical terminology mapping.
5. `structured_information_extraction`: Identification of diagnosis, vitals, and prescribed medications.
6. `human_review`: Clinical confirmation interface.

### Technical Safeguards:
- **Idempotency & Duplicate Prevention**: Active `PROCESSING` jobs within a 5-minute timeout window reject duplicate submissions with an `ALREADY_ACTIVE` status.
- **Retry Counters**: Processing attempts are incremented and logged (`processing_attempts`).
- **Metadata Isolation**: OCR and AI processing metadata is isolated in `processing_metadata` without altering original upload attributes.
- **Human In The Loop**: Machine-extracted text is never used automatically to make clinical triage decisions.

---

## 10. Environment Variables

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `STORAGE_PROVIDER` | `local` | Active storage engine (`local`, `s3`, `minio`). |
| `STORAGE_LOCAL_DIR` | `backend/uploads/private_documents` | Root directory for local private storage. |
| `MAX_FILE_SIZE_MB` | `10` | Maximum allowed attachment size in megabytes. |
| `S3_ENDPOINT` | `null` | S3 / MinIO custom endpoint URL. |
| `S3_BUCKET` | `careconnect-documents-private` | Private bucket identifier. |
| `S3_REGION` | `us-east-1` | S3 region identifier. |
| `S3_ACCESS_KEY_ID` | `null` | S3 access key credential. |
| `S3_SECRET_ACCESS_KEY` | `null` | S3 secret key credential. |
| `S3_FORCE_PATH_STYLE` | `false` | Enable path-style S3 URLs for MinIO deployments. |

---

## 11. REST API Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/documents` | Upload and attach medical document |
| `GET` | `/api/v1/documents/:id` | Retrieve sanitized document metadata |
| `GET` | `/api/v1/documents/:id/download` | Download binary attachment |
| `GET` | `/api/v1/documents/:id/preview` | Preview binary attachment inline |
| `POST` | `/api/v1/documents/:id/replace` | Upload replacement version (with concurrency check) |
| `GET` | `/api/v1/documents/:id/versions` | Query document version history lineage |
| `POST` | `/api/v1/documents/:id/verify` | Record human verification review outcome |
| `POST` | `/api/v1/documents/:id/archive` | Transition document to ARCHIVED lifecycle state |
| `DELETE` | `/api/v1/documents/:id` | Soft-delete document with mandatory reason |
| `GET` | `/api/v1/documents/:id/logs` | Query document access and security audit history |
| `GET` | `/api/v1/documents/:id/processing` | Query AI/OCR processing status and metadata |
| `POST` | `/api/v1/documents/:id/processing/queue` | Queue document for AI/OCR processing pipeline |
| `POST` | `/api/v1/documents/:id/processing/complete` | Worker callback recording processing results |
| `GET` | `/api/v1/referrals/:id/documents` | List attachments associated with a referral |
| `POST` | `/api/v1/referrals/:id/documents` | Upload attachment directly against a referral |
| `GET` | `/api/v1/patients/:id/documents` | List attachments associated with a patient |
| `POST` | `/api/v1/patients/:id/documents` | Upload attachment directly against a patient |
