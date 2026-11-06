# CareConnect Ethiopia — Database Subsystem Architecture

## 1. Overview
The CareConnect Ethiopia database subsystem provides the authoritative persistence layer for all four independent portals (Health Centre, Hospital, Transport Coordinator, System Administrator) and the AI Decision Service. Hosted on **Neon Cloud PostgreSQL**, it enforces strict relational integrity, TLS 1.3 encrypted data in transit, foreign key constraints, and tamper-evident audit logging.

## 2. Directory Structure
```text
database/
├── README.md                  # Database subsystem overview and quick reference
├── connection.js              # Neon PostgreSQL client connection pool & SSL handler
├── migrate.js                 # Safe transactional migration runner
├── seed.js                    # Fictional demo dataset seeder
├── diagrams/
│   └── erd.mermaid            # Complete Entity-Relationship Diagram
├── documentation/
│   └── README.md              # Migration architecture documentation
├── migrations/                # Version-controlled DDL migration scripts
│   ├── 001 to 018             # Foundational schema migrations
│   └── 019 to 024             # Part 02 domain enhancements & indexes
├── schema/                    # Target PostgreSQL schema references
├── seeds/                     # Fictional demo seed fixtures
└── tests/                     # Automated DDL, constraint, and relation test suites
```

## 3. Core Database Domains
1. **Identity & Access Management:** Users, roles, permissions, multi-role mapping, session tokens.
2. **Healthcare Facilities:** Facility classification tiers, clinical departments, bed/ICU capacity, service capabilities.
3. **Patients:** Demographics, patronymic naming, national Fayda ID, emergency contacts, medical baselines.
4. **Referral Management & Workflow:** Referral state machine, clinical triage, receiving decisions, counter-referral feedback.
5. **Clinical Documents & OCR:** Attachment metadata, S3/blob object URIs, OCR extraction tracking.
6. **Emergency Transportation:** Ambulance fleet registry, transport dispatch requests, transit milestones, delay incident reports.
7. **Notifications:** Multi-channel alerting, recipient targeting, delivery statuses, user preferences.
8. **AI Subsystem Governance:** Explainable facility recommendation scoring, delay risk prediction, model versioning, human review tracking.
9. **Audit & Regulatory Compliance:** Security audit trails, system events, IP/user-agent tracking.

## 4. Documentation References
- Data Model Specification: [docs/database/data-model.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/database/data-model.md)
- Relational Cardinality & Ownership: [docs/database/relationships.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/database/relationships.md)
- Constraints & Integrity Rules: [docs/database/constraints.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/database/constraints.md)
- Indexing & Query Patterns: [docs/database/indexing-strategy.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/database/indexing-strategy.md)
- Privacy, Security & RLS: [docs/database/privacy-and-security.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/database/privacy-and-security.md)
- Migration Runner Guide: [docs/database/migration-guide.md](file:///c:/Users/DELL%207020/Desktop/CareConnect%20Ethiopia%20Healthcare%20Dashboard%20Collage/docs/database/migration-guide.md)
