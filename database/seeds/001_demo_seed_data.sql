-- ============================================================================
-- CARECONNECT ETHIOPIA - FICTIONAL SEED DATA
-- DISCLAIMER: All records in this file are entirely FICTIONAL and generated for
-- system demonstration, interface testing, and development validation only.
-- NO ACTUAL PATIENT IDENTIFIABLE HEALTH INFORMATION IS CONTAINED HEREIN.
-- ============================================================================

-- 1. Healthcare Facilities (Addis Ababa Referral Grid)
INSERT INTO healthcare_facilities (
    id, name, amharic_name, facility_type, tier, ownership, region, subcity, woreda, phone_number,
    latitude, longitude, total_beds, total_icu_beds, has_emergency_department, has_blood_bank, has_ct_scan, has_mri
) VALUES
    ('FAC-HC-KAZANCHIS', 'Kazanchis Health Centre', 'ካዛንቺስ ጤና ጣቢያ', 'HEALTH_CENTRE', 'PRIMARY', 'PUBLIC', 'Addis Ababa', 'Kirkos', '08', '+251-11-551-1234', 9.0182, 38.7712, 12, 0, TRUE, FALSE, FALSE, FALSE),
    ('FAC-HC-BOLE17', 'Bole 17 Health Centre', 'ቦሌ 17 ጤና ጣቢያ', 'HEALTH_CENTRE', 'PRIMARY', 'PUBLIC', 'Addis Ababa', 'Bole', '03', '+251-11-662-5678', 8.9954, 38.7885, 15, 0, TRUE, FALSE, FALSE, FALSE),
    ('FAC-HC-KIRKOS', 'Kirkos Health Centre', 'ቂርቆስ ጤና ጣቢያ', 'HEALTH_CENTRE', 'PRIMARY', 'PUBLIC', 'Addis Ababa', 'Kirkos', '02', '+251-11-440-9876', 9.0065, 38.7523, 10, 0, TRUE, FALSE, FALSE, FALSE),
    ('FAC-HOSP-TIKUR', 'Tikur Anbessa (Black Lion) Specialized Hospital', 'ጥቁር አንበሳ ስፔሻላይዝድ ሆስፒታል', 'TERTIARY_HOSPITAL', 'TERTIARY', 'PUBLIC', 'Addis Ababa', 'Lideta', '09', '+251-11-551-1200', 9.0163, 38.7495, 750, 45, TRUE, TRUE, TRUE, TRUE),
    ('FAC-HOSP-STPAUL', 'St. Paul Hospital Millennium Medical College', 'ቅዱስ ጳውሎስ ሆስፒታል ሚሊኒየም ሜዲካል ኮሌጅ', 'TERTIARY_HOSPITAL', 'TERTIARY', 'PUBLIC', 'Addis Ababa', 'Gulele', '05', '+251-11-275-0125', 9.0560, 38.7282, 600, 36, TRUE, TRUE, TRUE, TRUE),
    ('FAC-HOSP-YEKA12', 'Yekatit 12 Hospital Medical College', 'የካቲት 12 ሆስፒታል ሜዲካል ኮሌጅ', 'GENERAL_HOSPITAL', 'SECONDARY', 'PUBLIC', 'Addis Ababa', 'Arada', '04', '+251-11-155-3211', 9.0392, 38.7610, 350, 18, TRUE, TRUE, TRUE, FALSE),
    ('FAC-HOSP-ZEWDITU', 'Zewditu Memorial Hospital', 'ዘውዲቱ መታሰቢያ ሆስፒታል', 'GENERAL_HOSPITAL', 'SECONDARY', 'PUBLIC', 'Addis Ababa', 'Kirkos', '06', '+251-11-551-8085', 9.0150, 38.7580, 280, 12, TRUE, TRUE, FALSE, FALSE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Demo Users (Password: "password123" for all demo users - bcrypt hash: $2a$10$wT8KzG0zL5p0Gz3d3Ld4IuU7aD1aH2bJ3cK4dL5eM6fN7gO8pQ9rS)
-- Precomputed bcrypt for "password123": $2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdFsTGaprMmBx.HK
INSERT INTO users (
    id, email, password_hash, first_name, last_name, phone_number, role_id, facility_id, department, job_title
) VALUES
    (1, 'health.officer@careconnect.et', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdFsTGaprMmBx.HK', 'Abebe', 'Bekele', '+251-91-123-4567', 1, 'FAC-HC-KAZANCHIS', 'Outpatient Referral', 'Senior Health Officer'),
    (2, 'triage.doctor@careconnect.et', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdFsTGaprMmBx.HK', 'Dr. Bethlehem', 'Tadesse', '+251-91-234-5678', 3, 'FAC-HOSP-TIKUR', 'Emergency & Triage Unit', 'Chief Triage Specialist'),
    (3, 'transport.dispatch@careconnect.et', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdFsTGaprMmBx.HK', 'Dawit', 'Alemu', '+251-91-345-6789', 4, 'FAC-HOSP-TIKUR', 'Central Dispatch Unit', 'Fleet Dispatch Coordinator'),
    (4, 'system.admin@careconnect.et', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdFsTGaprMmBx.HK', 'Selamawit', 'Haile', '+251-91-456-7890', 6, NULL, 'FMoH Digital Health Directorate', 'National System Administrator')
ON CONFLICT (id) DO NOTHING;

-- 3. Live Facility Capacity Reports
INSERT INTO facility_capacity_reports (
    facility_id, total_beds, available_beds, occupied_beds, total_icu_beds, available_icu_beds, occupied_icu_beds, total_ventilators, available_ventilators, operating_rooms_available, emergency_occupancy_percentage
) VALUES
    ('FAC-HOSP-TIKUR', 750, 48, 702, 45, 4, 41, 30, 3, 2, 92.50),
    ('FAC-HOSP-STPAUL', 600, 62, 538, 36, 6, 30, 24, 5, 3, 86.00),
    ('FAC-HOSP-YEKA12', 350, 54, 296, 18, 5, 13, 12, 3, 2, 78.50),
    ('FAC-HOSP-ZEWDITU', 280, 42, 238, 12, 3, 9, 8, 2, 1, 82.00)
ON CONFLICT DO NOTHING;

-- 4. Fictional Patients
INSERT INTO patients (
    id, first_name, father_name, grandfather_name, gender, date_of_birth, age_years, national_id, phone_number, region, subcity_zone, woreda, registered_facility_id
) VALUES
    ('PAT-2026-0001', 'Chaltu', 'Gemechu', 'Tufa', 'FEMALE', '1996-04-12', 30, 'FAYDA-9821034', '+251-92-001-1122', 'Addis Ababa', 'Kirkos', '08', 'FAC-HC-KAZANCHIS'),
    ('PAT-2026-0002', 'Yohannes', 'Kassahun', 'Mekonnen', 'MALE', '1974-08-23', 52, 'FAYDA-7712390', '+251-92-002-2233', 'Addis Ababa', 'Kirkos', '02', 'FAC-HC-KIRKOS'),
    ('PAT-2026-0003', 'Tigist', 'Assefa', 'Worku', 'FEMALE', '2001-11-05', 25, 'FAYDA-8834921', '+251-92-003-3344', 'Addis Ababa', 'Bole', '03', 'FAC-HC-BOLE17')
ON CONFLICT (id) DO NOTHING;

-- 5. Fictional Referrals
INSERT INTO referrals (
    id, patient_id, origin_facility_id, destination_facility_id, referring_clinician_id, priority, status,
    primary_diagnosis, clinical_summary, reason_for_referral, required_specialty,
    vitals_blood_pressure, vitals_pulse_rate, vitals_respiratory_rate, vitals_temperature, vitals_spo2,
    transport_required, ai_recommended_facility_id, submitted_at
) VALUES
    (
        'REF-20261105-001', 'PAT-2026-0001', 'FAC-HC-KAZANCHIS', 'FAC-HOSP-TIKUR', 1, 'EMERGENCY', 'SUBMITTED',
        'Severe Pre-eclampsia with Imminent Eclampsia',
        'Gravida 2 Para 1 at 36 weeks gestation presenting with severe persistent frontal headache, epigastric pain, and visual disturbances.',
        'Requires immediate emergency cesarean delivery and neonatal ICU support not available at health centre.',
        'OBSTETRICS_GYNECOLOGY',
        '175/115 mmHg', 104, 24, 37.2, 96,
        TRUE, 'FAC-HOSP-TIKUR', CURRENT_TIMESTAMP - INTERVAL '25 minutes'
    ),
    (
        'REF-20261105-002', 'PAT-2026-0002', 'FAC-HC-KIRKOS', 'FAC-HOSP-STPAUL', 1, 'URGENT', 'ACCEPTED',
        'Acute Coronary Syndrome (NSTEMI)',
        '52-year-old male with substernal crushing chest pain radiating to left arm for 4 hours. ECG reveals ST depressions in V3-V6.',
        'Urgent invasive cardiology evaluation and catheterization angiography.',
        'CARDIOLOGY',
        '145/90 mmHg', 88, 20, 36.8, 95,
        TRUE, 'FAC-HOSP-STPAUL', CURRENT_TIMESTAMP - INTERVAL '1 hour'
    )
ON CONFLICT (id) DO NOTHING;

-- 6. Transport Resources & Trips
INSERT INTO transport_resources (id, plate_number, vehicle_type, assigned_facility_id, status, driver_name, driver_phone)
VALUES
    ('AMB-AA-01', 'ET-3-45812', 'ALS', 'FAC-HOSP-TIKUR', 'DISPATCHED', 'Tamrat Desta', '+251-91-555-0101'),
    ('AMB-AA-02', 'ET-3-88201', 'BLS', 'FAC-HOSP-STPAUL', 'AVAILABLE', 'Mulugeta Tesfaye', '+251-91-555-0102')
ON CONFLICT (id) DO NOTHING;

INSERT INTO transport_records (
    id, referral_id, resource_id, origin_facility_id, destination_facility_id, priority, status,
    driver_name, driver_phone, dispatched_at, estimated_distance_km
) VALUES
    ('TR-20261105-001', 'REF-20261105-001', 'AMB-AA-01', 'FAC-HC-KAZANCHIS', 'FAC-HOSP-TIKUR', 'EMERGENCY', 'DISPATCHED', 'Tamrat Desta', '+251-91-555-0101', CURRENT_TIMESTAMP - INTERVAL '10 minutes', 3.8)
ON CONFLICT (id) DO NOTHING;
