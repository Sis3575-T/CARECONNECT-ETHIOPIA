-- CareConnect Ethiopia - Facility Services Schema
-- Version: 005
-- Description: Establishes clinical services catalog and facility service capabilities

CREATE TABLE IF NOT EXISTS clinical_services (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'SURGICAL', 'MEDICAL', 'MATERNAL_CHILD', 'DIAGNOSTIC', 'EMERGENCY'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facility_services (
    id SERIAL PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    service_code VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    has_specialist_on_duty BOOLEAN DEFAULT TRUE,
    operating_hours VARCHAR(100) DEFAULT '24/7',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_facility_service UNIQUE (facility_id, service_code)
);

CREATE INDEX IF NOT EXISTS idx_facility_services_fac_id ON facility_services(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_services_code ON facility_services(service_code);
CREATE INDEX IF NOT EXISTS idx_facility_services_avail ON facility_services(is_available);

-- Seed Canonical Clinical Services
INSERT INTO clinical_services (code, name, category, description) VALUES
    ('OBSTETRICS_GYNECOLOGY', 'Obstetrics & Gynecology (C-Section, High-risk delivery)', 'MATERNAL_CHILD', 'Comprehensive emergency obstetric and neonatal care'),
    ('PEDIATRICS', 'General Pediatrics', 'MATERNAL_CHILD', 'Inpatient and outpatient specialized pediatric medical management'),
    ('PEDIATRIC_ICU', 'Pediatric Intensive Care Unit (PICU)', 'MATERNAL_CHILD', 'Advanced pediatric critical care with pediatric mechanical ventilation'),
    ('NEONATAL_ICU', 'Neonatal Intensive Care Unit (NICU)', 'MATERNAL_CHILD', 'Incubator, phototherapy, and CPAP respiratory support for newborns'),
    ('GENERAL_SURGERY', 'General Surgery', 'SURGICAL', 'Emergency laparotomy, appendectomy, trauma surgical interventions'),
    ('ORTHOPEDICS', 'Orthopedic & Trauma Surgery', 'SURGICAL', 'Complex fracture reduction, bone pinning, joint reconstructions'),
    ('NEUROSURGERY', 'Neurosurgery & Spine Care', 'SURGICAL', 'Craniotomy for intracranial hemorrhage, traumatic brain injury triage'),
    ('CARDIOLOGY', 'Cardiology & Cath Lab', 'MEDICAL', 'Echocardiography, acute myocardial infarction, invasive cardiac care'),
    ('INTERNAL_MEDICINE', 'Internal Medicine & Nephrology', 'MEDICAL', 'Hemodialysis, severe infectious disease, acute kidney injury'),
    ('ADULT_ICU', 'Adult Intensive Care Unit (ICU)', 'EMERGENCY', 'Multi-organ failure support with dedicated adult mechanical ventilators'),
    ('TRAUMA_EMERGENCY', 'Comprehensive Trauma Emergency Center', 'EMERGENCY', 'Mass casualty resuscitation and 24/7 trauma triage theater'),
    ('CT_SCAN', 'Computed Tomography (CT) Imaging', 'DIAGNOSTIC', 'Head, body, and polytrauma computed tomography scanning'),
    ('MRI', 'Magnetic Resonance Imaging (MRI)', 'DIAGNOSTIC', 'High-field neurological and musculoskeletal magnetic resonance imaging')
ON CONFLICT (code) DO NOTHING;
