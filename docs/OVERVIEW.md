# CareConnect Ethiopia — Project Overview & Objectives

## 1. Executive Summary

**CareConnect Ethiopia** is a national-scale, AI-powered smart healthcare referral and patient coordination platform designed specifically for the Ethiopian healthcare delivery ecosystem. It connects Primary Healthcare Units (Health Centres), General Hospitals, Tertiary Specialized Teaching Hospitals (such as Tikur Anbessa / Black Lion Specialized Hospital and St. Paul's Hospital Millennium Medical College), Ambulance & Transport Dispatch Units, and Regional/Federal Health Authorities into a unified, responsive coordination grid.

---

## 2. Problem Statement & Context

Ethiopia's healthcare system follows a three-tier healthcare delivery system:
1. **Primary Health Care Unit (PHCU)**: Health Posts, Health Centres, and Primary Hospitals.
2. **Secondary Level**: General Hospitals.
3. **Tertiary Level**: Specialized Referral Hospitals.

### Existing Bottlenecks:
- **Paper-Based Referral Notes**: Over 80% of referrals in rural and peri-urban clinics rely on physical paper referral notes which are often illegible, misplaced, or incomplete upon patient arrival.
- **Blind Referrals**: Health centres refer acute and specialized cases without real-time visibility into bed occupancy, ICU ventilator availability, or specialist on-call status at receiving hospitals.
- **Critical Transport Delays**: Ambulance coordination is decentralized and fragmented, with no real-time telemetry or arrival notifications for receiving triage units.
- **Overcrowding of Tertiary Centers**: Patients frequently bypass primary and general hospitals, overcrowding national tertiary centers with cases manageable at lower tiers.

---

## 3. Core Objectives

1. **Digital Referral Lifecycle Management**: Establish a unified digital workflow from referral creation at health centres to triage, bed reservation, transport coordination, hospital admission, and post-discharge feedback.
2. **AI-Driven Facility Matching**: Provide transparent, explainable recommendations matching patient clinical needs (specialty, urgency, equipment) against live hospital capacity, bed availability, and transit distance.
3. **OCR Paper Digitization**: Convert legacy paper referral forms into structured electronic records using Tesseract OCR and OpenCV preprocessing, supporting English and Amharic text.
4. **Coordinated Emergency Transport**: Enable real-time transport dispatch, milestone event tracking (dispatched, en route, arrived), and interactive GIS route visualization.
5. **Transparency & Auditability**: Ensure end-to-end accountability through immutable audit logs, SLA monitoring, and role-based access control.

---

## 4. Target User Personas

| User Persona | Role | Primary Workflows | Key Portal |
|---|---|---|---|
| **Health Centre Officer** | Primary Care Clinician / Health Officer | Patient intake, clinical assessment, draft referral creation, document upload, AI recommendation review, referral submission. | Health Centre Portal (`:5173`) |
| **Hospital Triage Doctor** | Specialist / Triage Nurse / Admissions | Review incoming referrals, evaluate triage flags, reserve beds/ICU, accept/reject with reason, request additional clinical info, record patient arrival. | Hospital Portal (`:5174`) |
| **Transport Dispatcher** | Ambulance Coordinator / EMT | Monitor transport requests, assign ambulance units/drivers, report departure/delays/arrival, visualize transit corridors. | Transport Portal (`:5175`) |
| **System Administrator** | Ministry / Hospital Admin / IT Officer | Manage facility directories, services catalog, user accounts, system configuration, AI model performance monitoring, analytics. | Administrator Portal (`:5176`) |

---

## 5. Architectural Principles

- **Four Independent Portals**: Dedicated, lightweight web applications tailored to each persona's operational environment.
- **Dual API Architecture**: Fast, resilient Node.js Express main backend paired with an intelligent Python FastAPI AI microservice.
- **Explainable AI Guardrails**: AI acts as a decision-support copilot; all clinical acceptance and triage decisions strictly require licensed human clinician approval.
- **FMoH Standards Compliance**: Designed in alignment with Ethiopian Federal Ministry of Health Digital Health Blueprint and National Referral Guidelines.
