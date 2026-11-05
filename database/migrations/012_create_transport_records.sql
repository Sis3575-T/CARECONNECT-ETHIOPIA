-- CareConnect Ethiopia - Transport Records & Resource Fleet Schema
-- Version: 012
-- Description: Establishes emergency ambulance resources and patient transportation coordination records

CREATE TABLE IF NOT EXISTS transport_resources (
    id VARCHAR(50) PRIMARY KEY, -- e.g. AMB-AA-01
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50) NOT NULL DEFAULT 'BLS', -- 'BLS' (Basic Life Support), 'ALS' (Advanced Life Support), 'PATIENT_TRANSPORT'
    assigned_facility_id VARCHAR(50) REFERENCES healthcare_facilities(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'MAINTENANCE', 'OFF_DUTY'
    driver_name VARCHAR(100),
    driver_phone VARCHAR(50),
    current_latitude DECIMAL(10, 7),
    current_longitude DECIMAL(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transport_records (
    id VARCHAR(50) PRIMARY KEY, -- e.g. TR-20261105-001
    referral_id VARCHAR(50) NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    resource_id VARCHAR(50) REFERENCES transport_resources(id) ON DELETE SET NULL,
    origin_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    destination_facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE RESTRICT,
    priority VARCHAR(20) NOT NULL DEFAULT 'URGENT', -- 'ROUTINE', 'URGENT', 'EMERGENCY'
    status VARCHAR(30) NOT NULL DEFAULT 'REQUESTED', -- 'REQUESTED', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'CANCELLED'
    requested_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    driver_name VARCHAR(100),
    driver_phone VARCHAR(50),
    dispatched_at TIMESTAMP WITH TIME ZONE,
    departed_at TIMESTAMP WITH TIME ZONE,
    estimated_arrival_at TIMESTAMP WITH TIME ZONE,
    actual_arrival_at TIMESTAMP WITH TIME ZONE,
    estimated_distance_km DECIMAL(6, 2),
    delay_reason VARCHAR(100), -- 'TRAFFIC', 'ROAD_CONDITIONS', 'MECHANICAL', 'PATIENT_STABILIZATION', 'WEATHER', 'OTHER'
    delay_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transport_referral ON transport_records(referral_id);
CREATE INDEX IF NOT EXISTS idx_transport_resource ON transport_records(resource_id);
CREATE INDEX IF NOT EXISTS idx_transport_status ON transport_records(status);
CREATE INDEX IF NOT EXISTS idx_transport_dest ON transport_records(destination_facility_id);
CREATE INDEX IF NOT EXISTS idx_resources_status ON transport_resources(status);
