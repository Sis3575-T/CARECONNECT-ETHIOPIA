/**
 * CareConnect Ethiopia - Portal Definitions & Metadata
 * Defines portal keys, titles, descriptions, default dev ports, and theme accents.
 */

export const PORTALS = {
  HEALTH_CENTRE: {
    id: 'health-centre',
    key: 'health_centre',
    name: 'Health Centre Portal',
    shortName: 'Health Centre',
    description: 'Primary Care Referrals, Patient Intake & AI Slip OCR',
    defaultPort: 5173,
    themeAccent: 'sky', // sky-500, sky-600
    primaryColor: '#0284c7',
    iconName: 'Building',
    allowedRoles: [
      'HEALTH_CENTRE_REFERRAL_CLINICIAN',
      'PRIMARY_CARE_PHYSICIAN',
      'CLINICAL_NURSE',
      'SYSTEM_ADMINISTRATOR',
      'REGIONAL_OFFICER'
    ]
  },
  HOSPITAL: {
    id: 'hospital',
    key: 'hospital',
    name: 'Hospital Portal',
    shortName: 'Hospital',
    description: 'Specialist Triage, Bed Allocation & Inpatient Admissions',
    defaultPort: 5174,
    themeAccent: 'emerald', // emerald-500, emerald-600
    primaryColor: '#059669',
    iconName: 'Building2',
    allowedRoles: [
      'HOSPITAL_TRIAGE_CLINICIAN',
      'EMERGENCY_PHYSICIAN',
      'CHIEF_CLINICAL_OFFICER',
      'SYSTEM_ADMINISTRATOR',
      'REGIONAL_OFFICER'
    ]
  },
  TRANSPORT: {
    id: 'transport',
    key: 'transport',
    name: 'Transport Coordinator Portal',
    shortName: 'Transport',
    description: 'Ambulance Dispatch, Fleet Coordination & GPS Tracking',
    defaultPort: 5175,
    themeAccent: 'purple', // purple-600, purple-700
    primaryColor: '#7c3aed',
    iconName: 'Truck',
    allowedRoles: [
      'TRANSPORT_COORDINATOR',
      'AMBULANCE_DISPATCHER',
      'AMBULANCE_DRIVER',
      'SYSTEM_ADMINISTRATOR',
      'REGIONAL_OFFICER'
    ]
  },
  ADMINISTRATOR: {
    id: 'administrator',
    key: 'administrator',
    name: 'System Administrator Portal',
    shortName: 'Admin',
    description: 'National System Governance, Facility Directory & AI Oversight',
    defaultPort: 5176,
    themeAccent: 'navy', // slate-900 / blue-900
    primaryColor: '#0f172a',
    iconName: 'Shield',
    allowedRoles: [
      'SYSTEM_ADMINISTRATOR',
      'REGIONAL_OFFICER',
      'MOH_DATA_ANALYST'
    ]
  }
};

export const PORTAL_LIST = Object.values(PORTALS);

export function getPortalById(portalId) {
  return PORTAL_LIST.find(p => p.id === portalId || p.key === portalId) || PORTALS.HEALTH_CENTRE;
}
