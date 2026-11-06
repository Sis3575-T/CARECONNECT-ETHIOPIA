# CareConnect Ethiopia — Patient Domain Data Model & Governance Architecture

## 1. Overview & Healthcare Context

The **Patient Management Domain** in CareConnect Ethiopia establishes a secure, unified patient demographic, identification, and baseline clinical model. It addresses specific Ethiopian healthcare operational realities:

1. **Patronymic Naming System**: Ethiopian individuals typically do not use Western hereditary family surnames. Instead, naming follows **Given Name (First Name)**, **Father's Name**, and **Grandfather's Name**.
2. **Age & Birth Date Optionality**: Exact calendar birth dates may not be known by rural or elderly patients. The system supports direct `age_years` and `age_months` entry with an `is_dob_estimated` flag, while optionally accepting exact calendar `date_of_birth` when available.
3. **Communication Optionality**: Cellular coverage and phone ownership vary across regional woredas. A patient phone number is **strictly optional** and missing contacts must never block emergency or routine registration.
4. **National & Regional Identifiers**:
   - **Fayda ID**: Ethiopian National ID system (`national_id`).
   - **Kebele ID**: Neighborhood administrative residence identification card (`kebele_id`).
   - **Facility MRN**: Standardized institutional Medical Record Number (`medical_record_number`).
5. **Administrative Geography**: Structured hierarchical addressing following Ethiopian governance: `region`, `subcity_zone`, `woreda`, `kebele`, and `house_number`.

---

## 2. Relational Entity Structure

The patient domain is structured across normalized tables to ensure relational integrity, auditability, and clinical safety:

```mermaid
erDiagram
    PATIENTS ||--o{ PATIENT_IDENTIFIERS : "identifies"
    PATIENTS ||--o{ PATIENT_EMERGENCY_CONTACTS : "contacts"
    PATIENTS ||--o| PATIENT_MEDICAL_BASELINE : "clinical baseline"
    PATIENTS ||--o{ PATIENT_CORRECTIONS : "tracks corrections"
    PATIENTS ||--o{ PATIENT_DUPLICATE_REVIEWS : "reviewed duplicates"
    PATIENTS ||--o{ PATIENT_MERGE_REQUESTS : "merge history"
    HEALTHCARE_FACILITIES ||--o{ PATIENTS : "registered at"

    PATIENTS {
        varchar(50) id PK "ETH-PAT-YYYY-XXXXXX"
        uuid uuid UK "gen_random_uuid()"
        varchar first_name "Given name"
        varchar father_name "Father's name"
        varchar grandfather_name "Grandfather's name"
        varchar gender "MALE, FEMALE, OTHER"
        date date_of_birth "Optional"
        int age_years "Required"
        int age_months "Optional"
        boolean is_dob_estimated "True if derived or estimated"
        varchar national_id "Fayda ID UK"
        varchar kebele_id "Local ID"
        varchar phone_number "Optional"
        varchar region "Ethiopian Region"
        varchar subcity_zone "Zone/Subcity"
        varchar woreda "Woreda/District"
        varchar kebele "Kebele/Neighborhood"
        varchar house_number "Optional"
        varchar status "ACTIVE, INACTIVE, DECEASED, MERGED"
        varchar confidentiality_level "STANDARD, VIP, SENSITIVE"
        varchar registered_facility_id FK "healthcare_facilities"
        varchar merged_into_patient_id FK "patients"
        timestamp deleted_at "Soft delete"
    }

    PATIENT_IDENTIFIERS {
        int id PK
        uuid uuid UK
        varchar patient_id FK
        varchar identifier_type "FAYDA_ID, KEBELE_ID, PASSPORT, FACILITY_MRN"
        varchar identifier_value
        varchar issuing_authority
        boolean is_primary
    }

    PATIENT_EMERGENCY_CONTACTS {
        int id PK
        uuid uuid UK
        varchar patient_id FK
        varchar full_name
        varchar relationship "SPOUSE, PARENT, CHILD, SIBLING, GUARDIAN, OTHER"
        varchar phone_number
        varchar alternate_phone
        boolean is_primary_contact
    }

    PATIENT_MEDICAL_BASELINE {
        int id PK
        uuid uuid UK
        varchar patient_id FK
        varchar blood_group
        text allergies
        text chronic_illnesses
        text current_medications
        text disabilities
        int recorded_by_user_id FK
    }

    PATIENT_CORRECTIONS {
        int id PK
        uuid uuid UK
        varchar patient_id FK
        varchar field_name
        text old_value
        text new_value
        text reason
        int corrected_by_user_id FK
        timestamp created_at
    }

    PATIENT_DUPLICATE_REVIEWS {
        int id PK
        uuid uuid UK
        varchar target_patient_id FK
        varchar candidate_patient_id FK
        varchar review_status "CONFIRMED_MATCH, FALSE_POSITIVE, UNDER_INVESTIGATION"
        numeric match_score
        jsonb match_signals
        int reviewed_by_user_id FK
        text notes
    }

    PATIENT_MERGE_REQUESTS {
        int id PK
        uuid uuid UK
        varchar source_patient_id FK
        varchar target_patient_id FK
        varchar status "PENDING, APPROVED, REJECTED"
        text reason
        int requested_by_user_id FK
        int reviewed_by_user_id FK
        text review_notes
    }
```

---

## 3. Privacy, Authorization & Facility Isolation Boundaries

Access to patient records is governed by strict Role-Based Access Control (RBAC) and facility tenancy boundaries:

| Portal / Role | Registration | Demographics Search | Clinical Record View | Emergency Contacts | Merge / Duplicate Review |
|---|---|---|---|---|---|
| **Health Centre Staff** | ✅ Full at registered facility | ✅ Filtered by facility tenancy | ✅ Full clinical history | ✅ Manage contacts | ✅ Flag & Submit Review |
| **Hospital Staff / Triage** | ❌ Read-only via Referral | ⚠️ Only referred patients | ✅ Clinical view for admitted/referred | ✅ View only | ⚠️ Report collision |
| **Transport Coordinator** | ❌ No direct registration | ❌ Restricted | ⚠️ Minimum journey-essential only | ✅ View primary contact | ❌ No access |
| **System Administrator** | ❌ No direct clinical entries | ⚠️ Audit & system search | ❌ Restricted from raw medical charts | ⚠️ Technical oversight | ✅ Oversee approval workflow |

---

## 4. Duplicate Detection & Clinical Human-in-the-Loop Review

Automatic merging of medical identities presents severe clinical risks (e.g., misassigned medications, incompatible blood transfusions). The system strictly enforces:

1. **Scoring Signals**:
   - Exact Fayda / National ID match: **Confirmed Match candidate (High priority)**.
   - Exact phone number + matching Given & Father names: **Probable candidate**.
   - Identical Patronymic 3-name tuple + matching Woreda + birth year: **Possible candidate**.
2. **Never Automatic**: Matches trigger candidate flags (`/api/v1/patients/identify` and `/api/v1/patients/:id/possible-duplicates`).
3. **Mandatory Human Review**: An authorized clinician or medical records officer must review duplicate candidates (`POST /api/v1/patients/:id/duplicate-review`) or initiate formal merge requests (`POST /api/v1/patients/merge-requests`) with documented clinical justification.
