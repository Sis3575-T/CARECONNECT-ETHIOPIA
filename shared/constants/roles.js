/**
 * CareConnect Ethiopia - Role & Permission Constants
 * Matches the backend Part 04 RBAC authorization domain.
 */

export const ROLES = {
  SYSTEM_ADMINISTRATOR: 'SYSTEM_ADMINISTRATOR',
  REGIONAL_OFFICER: 'REGIONAL_OFFICER',
  CHIEF_CLINICAL_OFFICER: 'CHIEF_CLINICAL_OFFICER',
  HOSPITAL_TRIAGE_CLINICIAN: 'HOSPITAL_TRIAGE_CLINICIAN',
  EMERGENCY_PHYSICIAN: 'EMERGENCY_PHYSICIAN',
  HEALTH_CENTRE_REFERRAL_CLINICIAN: 'HEALTH_CENTRE_REFERRAL_CLINICIAN',
  PRIMARY_CARE_PHYSICIAN: 'PRIMARY_CARE_PHYSICIAN',
  CLINICAL_NURSE: 'CLINICAL_NURSE',
  TRANSPORT_COORDINATOR: 'TRANSPORT_COORDINATOR',
  AMBULANCE_DISPATCHER: 'AMBULANCE_DISPATCHER',
  AMBULANCE_DRIVER: 'AMBULANCE_DRIVER',
  MOH_DATA_ANALYST: 'MOH_DATA_ANALYST'
};

export const ROLE_LABELS = {
  [ROLES.SYSTEM_ADMINISTRATOR]: 'System Administrator',
  [ROLES.REGIONAL_OFFICER]: 'Regional Health Bureau Officer',
  [ROLES.CHIEF_CLINICAL_OFFICER]: 'Chief Clinical Officer',
  [ROLES.HOSPITAL_TRIAGE_CLINICIAN]: 'Hospital Triage Clinician',
  [ROLES.EMERGENCY_PHYSICIAN]: 'Emergency Department Physician',
  [ROLES.HEALTH_CENTRE_REFERRAL_CLINICIAN]: 'Health Centre Clinician',
  [ROLES.PRIMARY_CARE_PHYSICIAN]: 'Primary Care Physician',
  [ROLES.CLINICAL_NURSE]: 'Clinical Triage Nurse',
  [ROLES.TRANSPORT_COORDINATOR]: 'Transport Coordinator',
  [ROLES.AMBULANCE_DISPATCHER]: 'Ambulance Dispatcher',
  [ROLES.AMBULANCE_DRIVER]: 'Ambulance Driver',
  [ROLES.MOH_DATA_ANALYST]: 'MoH Health Data Analyst'
};

export const PERMISSIONS = {
  // Referrals
  REFERRAL_CREATE: 'referral:create',
  REFERRAL_VIEW: 'referral:view',
  REFERRAL_UPDATE: 'referral:update',
  REFERRAL_SUBMIT: 'referral:submit',
  REFERRAL_TRIAGE: 'referral:triage',
  REFERRAL_ACCEPT: 'referral:accept',
  REFERRAL_REJECT: 'referral:reject',
  REFERRAL_CANCEL: 'referral:cancel',
  
  // Transport
  TRANSPORT_REQUEST: 'transport:request',
  TRANSPORT_ASSIGN: 'transport:assign',
  TRANSPORT_UPDATE: 'transport:update',
  TRANSPORT_VIEW: 'transport:view',
  
  // Facilities & Capacity
  FACILITY_VIEW: 'facility:view',
  FACILITY_MANAGE: 'facility:manage',
  CAPACITY_REPORT: 'capacity:report',
  
  // Admin & Monitoring
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  AUDIT_VIEW: 'audit:view',
  REALTIME_METRICS: 'realtime:metrics',
  AI_MANAGE: 'ai:manage'
};
