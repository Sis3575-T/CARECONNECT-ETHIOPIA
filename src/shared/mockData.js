// Comprehensive Ethiopian healthcare mock dataset for CareConnect Ethiopia

export const PORTAL_TYPES = {
  HEALTH_CENTRE: 'health_centre',
  HOSPITAL: 'hospital',
  TRANSPORT: 'transport',
  ADMIN: 'admin',
  COLLAGE: 'collage' // 2x2 view matching the original prompt screenshot
};

export const INITIAL_FACILITIES = [
  {
    id: 'fac-1',
    name: 'Tikur Anbessa Specialized Hospital (Black Lion)',
    type: 'Comprehensive Specialized Hospital',
    region: 'Addis Ababa',
    zone: 'Lideta',
    woreda: 'Woreda 08',
    beds: 800,
    availableBeds: 42,
    workloadLevel: 'High (88%)',
    specialties: ['Cardiology', 'Oncology', 'Neurosurgery', 'Pediatrics', 'ICU'],
    operatingStatus: 'Operational',
    distanceKm: 8.4,
    ratingScore: 98
  },
  {
    id: 'fac-2',
    name: "St. Paul's Hospital Millennium Medical College",
    type: 'Specialized Referral Hospital',
    region: 'Addis Ababa',
    zone: 'Gulele',
    woreda: 'Woreda 01',
    beds: 650,
    availableBeds: 28,
    workloadLevel: 'Moderate (74%)',
    specialties: ['Transplant Surgery', 'Obstetrics & Gynaecology', 'Cardiology', 'Emergency Trauma'],
    operatingStatus: 'Operational',
    distanceKm: 12.1,
    ratingScore: 94
  },
  {
    id: 'fac-3',
    name: 'ALERT Comprehensive Specialized Hospital',
    type: 'Specialized Hospital',
    region: 'Addis Ababa',
    zone: 'Kolfe Keranio',
    woreda: 'Woreda 05',
    beds: 450,
    availableBeds: 35,
    workloadLevel: 'Moderate (65%)',
    specialties: ['Trauma & Orthopedics', 'Dermatology', 'Reconstructive Surgery'],
    operatingStatus: 'Operational',
    distanceKm: 14.5,
    ratingScore: 91
  },
  {
    id: 'fac-4',
    name: 'Yeka Health Centre',
    type: 'Primary Health Centre',
    region: 'Addis Ababa',
    zone: 'Yeka',
    woreda: 'Woreda 03',
    beds: 25,
    availableBeds: 6,
    workloadLevel: 'Moderate',
    specialties: ['Outpatient', 'Maternal Health', 'Vaccination', 'Triage Referral'],
    operatingStatus: 'Operational',
    distanceKm: 0,
    ratingScore: 95
  },
  {
    id: 'fac-5',
    name: 'Wolkite Health Centre',
    type: 'Primary Health Centre',
    region: 'Central Ethiopia',
    zone: 'Gurage',
    woreda: 'Wolkite Town',
    beds: 30,
    availableBeds: 4,
    workloadLevel: 'High',
    specialties: ['Primary Care', 'Emergency First Aid', 'MCH'],
    operatingStatus: 'Operational',
    distanceKm: 158,
    ratingScore: 89
  },
  {
    id: 'fac-6',
    name: 'Dilla Health Centre',
    type: 'Health Centre',
    region: 'South Ethiopia',
    zone: 'Gedeo',
    woreda: 'Dilla Town',
    beds: 28,
    availableBeds: 8,
    workloadLevel: 'Normal',
    specialties: ['Primary Care', 'TB/HIV', 'Antenatal Care'],
    operatingStatus: 'Operational',
    distanceKm: 360,
    ratingScore: 88
  },
  {
    id: 'fac-7',
    name: 'Shashogo Health Centre',
    type: 'Health Centre',
    region: 'Central Ethiopia',
    zone: 'Hadiya',
    woreda: 'Bonosha',
    beds: 20,
    availableBeds: 5,
    workloadLevel: 'Normal',
    specialties: ['Primary Care', 'General Medicine'],
    operatingStatus: 'Operational',
    distanceKm: 230,
    ratingScore: 87
  }
];

export const INITIAL_HEALTH_CENTRE_REFERRALS = [
  {
    id: 'REF-2025-0841',
    patientName: 'Kebede Alemu',
    age: 54,
    gender: 'Male',
    service: 'Cardiology',
    referringFacility: 'Yeka Health Centre',
    receivingFacility: 'Tikur Anbessa Specialized Hospital',
    status: 'Pending',
    date: 'Jun 14, 2025',
    urgency: 'High Priority (Clinical Review)',
    clinicalSummary: 'Patient presented with 3-day exertional chest pain radiating to left shoulder, elevated troponin, ECG showing ST depressions in V4-V6. Suspected NSTEMI requiring urgent cardiac catheterization evaluation.',
    aiScore: 96,
    completeness: '100% Complete'
  },
  {
    id: 'REF-2025-0839',
    patientName: 'Almaz Ayana',
    age: 29,
    gender: 'Female',
    service: 'Obstetrics & Gynaecology',
    referringFacility: 'Yeka Health Centre',
    receivingFacility: "St. Paul's Hospital MMC",
    status: 'Accepted',
    date: 'Jun 13, 2025',
    urgency: 'Medium',
    clinicalSummary: 'Primigravida at 34 weeks with severe pre-eclampsia, BP 160/110 mmHg, proteinuria 3+. Transferred for maternal-fetal intensive management.',
    aiScore: 92,
    completeness: '100% Complete'
  },
  {
    id: 'REF-2025-0834',
    patientName: 'Dawit Yohannes',
    age: 19,
    gender: 'Male',
    service: 'Trauma & Orthopedics',
    referringFacility: 'Yeka Health Centre',
    receivingFacility: 'ALERT Trauma Hospital',
    status: 'Accepted',
    date: 'Jun 11, 2025',
    urgency: 'Urgent',
    clinicalSummary: 'Closed fracture of right tibia and fibula following motorcycle collision. Neurovascular exam intact. Immobilized with posterior splint.',
    aiScore: 95,
    completeness: '100% Complete'
  }
];

export const INITIAL_HOSPITAL_REFERRALS = [
  {
    id: 'REF-2025-0902',
    patientName: 'Hirut Tesfaye',
    age: 41,
    gender: 'Female',
    from: 'Wolkite HC',
    service: 'Cardiology',
    status: 'Pending',
    date: 'Jun 15, 2025',
    vitalSigns: 'BP: 155/95 | HR: 88 bpm | SpO2: 95%',
    reason: 'Refractory congestive heart failure symptoms with peripheral edema and orthopnea.'
  },
  {
    id: 'REF-2025-0887',
    patientName: 'Addis Tadesse',
    age: 36,
    gender: 'Male',
    from: 'Dilla HC',
    service: 'Neurosurgery',
    status: 'Accepted',
    date: 'Jun 14, 2025',
    vitalSigns: 'BP: 130/80 | HR: 76 bpm | SpO2: 98%',
    reason: 'Chronic subdural hematoma confirmed on non-contrast head CT with progressive headache and hemiparesis.'
  },
  {
    id: 'REF-2025-0879',
    patientName: 'Mekuria Bekele',
    age: 62,
    gender: 'Male',
    from: 'Shashogo HC',
    service: 'Oncology',
    status: 'Accepted',
    date: 'Jun 14, 2025',
    vitalSigns: 'BP: 120/75 | HR: 72 bpm | SpO2: 97%',
    reason: 'Suspected gastric malignancy with iron deficiency anemia and unexplained weight loss for biopsy & staging.'
  },
  {
    id: 'REF-2025-0865',
    patientName: 'Genet Mengistu',
    age: 24,
    gender: 'Female',
    from: 'Bishoftu HC',
    service: 'Pediatric Surgery',
    status: 'Rejected',
    date: 'Jun 12, 2025',
    vitalSigns: 'Stable',
    reason: 'Referred for adult ward; referred instead to St. Paul MMC Pediatric specialty branch.'
  }
];

export const INITIAL_TRANSPORT_REQUESTS = [
  {
    id: 'TR-4091',
    patientName: 'Selamawit Getachew',
    age: 31,
    condition: 'Complicated Labor / Postpartum Hemorrhage Risk',
    from: 'Yeka HC',
    to: 'Tikur Anbessa',
    ambulanceId: 'AMB-AA-04 (Advanced Life Support)',
    driverName: 'Tilahun Mengesha',
    driverPhone: '+251 91 123 4567',
    coordinator: 'Abebe Kebede',
    status: 'In Transit',
    departureTime: '10:40 AM',
    eta: '25 min',
    distanceRemaining: '4.8 km',
    priority: 'Critical / Siren Enabled'
  },
  {
    id: 'TR-4088',
    patientName: 'Teshome Bogale',
    age: 48,
    condition: 'Cardiac Monitoring Required',
    from: 'Bole 17 HC',
    to: 'Tikur Anbessa',
    ambulanceId: 'AMB-AA-11',
    driverName: 'Mulugeta Assefa',
    driverPhone: '+251 91 234 5678',
    coordinator: 'Abebe Kebede',
    status: 'Assigned',
    departureTime: 'Pending Departure',
    eta: '35 min',
    distanceRemaining: '9.2 km',
    priority: 'High'
  },
  {
    id: 'TR-4082',
    patientName: 'Fatuma Mohammed',
    age: 22,
    condition: 'Compound Fracture',
    from: 'Kolfe HC',
    to: 'ALERT Hospital',
    ambulanceId: 'AMB-AA-07',
    driverName: 'Kassahun Belay',
    driverPhone: '+251 91 345 6789',
    coordinator: 'Abebe Kebede',
    status: 'Completed',
    departureTime: '08:15 AM',
    eta: 'Arrived at 08:48 AM',
    distanceRemaining: '0 km',
    priority: 'Standard'
  }
];

export const INITIAL_ADMIN_STATS = {
  totalUsers: 1245,
  healthFacilities: 89,
  totalReferrals: 12430,
  systemUptime: '99.9%',
  aiAccuracy: '94%',
  aiAccuracyChange: '+2%',
  modelVersion: 'CareConnect-v2.4-Hybrid-NLP',
  activeWoredas: 48,
  activeRegions: 11
};

export const AI_BENCHMARKS = [
  { metric: 'OCR Text Extraction Precision', value: '96.2%', status: 'Optimal' },
  { metric: 'Clinical Entity Extraction (NLP)', value: '93.8%', status: 'Optimal' },
  { metric: 'Facility Recommendation Rank-1 Match', value: '91.5%', status: 'Optimal' },
  { metric: 'Missing Field Completeness Detection', value: '98.4%', status: 'Optimal' },
  { metric: 'Referral Delay Prediction ROC-AUC', value: '0.89', status: 'High' }
];
