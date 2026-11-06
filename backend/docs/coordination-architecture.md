# CareConnect Ethiopia — Referral Coordination & Escalation Architecture

## 1. Architectural Overview

The **Referral Coordination and Escalation Domain** provides an operational coordination layer above the referral state machine. It is designed specifically for the multi-tier healthcare ecosystem in Ethiopia, connecting primary health centres with general and tertiary referral hospitals while maintaining human-in-the-loop operational oversight.

Key principles:
- **Operational Escalation vs Clinical Triage**: An overdue referral deadline triggers human operator alerts; it **never** automatically alters clinical triage urgency (`ROUTINE` to `EMERGENCY`) or makes autonomous treatment decisions.
- **Configurable SLA Policies**: Administrators configure policies based on approved regional operational agreements rather than hardcoded assumptions.
- **Human-Authorized Reassignment**: Patients are never automatically reassigned by AI or stale bed-capacity counters without documented clinician or coordinator approval.
- **Strict Privacy Boundaries**: Communication timelines and public tracking protect confidential clinical details and patient demographics from non-clinical personnel.

---

## 2. Response Policies (SLAs) & Deadline Calculations

Response policies define expected operational milestones:
- `acknowledgement_deadline_minutes`: Target window for hospital to acknowledge receipt.
- `decision_deadline_minutes`: Target window for hospital to accept, reject, or request information.
- `follow_up_interval_minutes`: Interval for automated follow-up reminders.
- `escalation_threshold_minutes`: Threshold for escalating unhandled referrals.
- `working_hours_only` & `operating_days`: Explicit working-hour configurations for outpatient services.

Deadline calculations attach to the referral upon submission:
```json
{
  "policy_id": 1,
  "policy_version": 1,
  "acknowledgement_deadline": "2026-11-06T15:30:00.000Z",
  "decision_deadline": "2026-11-06T17:30:00.000Z"
}
```
Historical referrals retain the policy ID and version used at the time of submission, preventing retroactive SLA alterations when policies are updated.

---

## 3. Referral Follow-Up Workflow

Authorized coordinators record communication attempts across channels:
- `PHONE_CALL` (Manually logged by staff)
- `SMS` (Provider delivery status tracked)
- `EMAIL`
- `IN_PLATFORM`
- `MANUAL`

Each attempt records the responsible user, channel, delivery status (`MANUAL_RECORD` vs `DELIVERED`), outcome (`CONTACTED_STAFF`, `NO_ANSWER`, `LINE_BUSY`, `INFO_RECEIVED`), and optional scheduled next follow-up.

---

## 4. Structured Additional Information Requests

When receiving hospital clinicians require diagnostic clarifications (e.g. missing creatinine, ECG, ultrasound):
1. Hospital clinician creates request (`POST /api/v1/referrals/:id/information-requests`).
2. Referral state transitions to `INFO_REQUESTED`.
3. Referring health centre staff reviews request and attaches documentation (`POST /api/v1/referrals/:id/information-requests/:requestId/respond`).
4. Once all pending requests are resolved, referral state returns to `SUBMITTED` for hospital triage.

---

## 5. Human-Managed Reassignments

When a hospital cannot admit a patient (capacity exceeded, specialist unavailable):
- Authorized coordinators or clinicians execute reassignment (`POST /api/v1/referrals/:id/reassignments`).
- Mandatory operational reason code: `SERVICE_UNAVAILABLE`, `INSUFFICIENT_CAPACITY`, `INCORRECT_ASSIGNMENT`, `CLINICAL_ESCALATION`, `OPERATIONAL_DIRECTIVE`.
- Detailed justification note required.
- New hospital policy and response deadlines are automatically applied.

---

## 6. Operational Escalation Rules

Escalation levels:
- **Level 1**: Responsible facility staff.
- **Level 2**: Facility supervisor.
- **Level 3**: Regional / Coordination Administrator.

Conditions:
- `ACKNOWLEDGEMENT_DEADLINE_EXCEEDED`
- `DECISION_DEADLINE_EXCEEDED`
- `REPEATED_UNSUCCESSFUL_FOLLOWUP`
- `UNANSWERED_INFO_REQUEST`
- `UNASSIGNED_TIMEOUT`
- `MANUAL_OPERATIONAL_REPORT`

Duplicate escalation prevention ensures only one open escalation exists per unresolved condition per referral. Resolution requires a documented explanation (`POST /api/v1/escalations/:id/resolve`).

---

## 7. Unified Coordination Timeline

A unified chronological view (`GET /api/v1/referrals/:id/timeline`) aggregates:
- Referral status transitions
- Clinical triage decisions
- Follow-up attempts
- Additional information requests and responses
- Reassignments
- Operational escalations and resolutions

Generic event descriptions are privacy-sanitized to avoid exposing sensitive clinical text to non-authorized viewers.
