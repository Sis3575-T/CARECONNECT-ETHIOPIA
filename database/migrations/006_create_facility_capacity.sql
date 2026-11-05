-- CareConnect Ethiopia - Facility Capacity Reporting Schema
-- Version: 006
-- Description: Establishes time-stamped facility capacity audit reports and current bed/ICU/ventilator states

CREATE TABLE IF NOT EXISTS facility_capacity_reports (
    id SERIAL PRIMARY KEY,
    facility_id VARCHAR(50) NOT NULL REFERENCES healthcare_facilities(id) ON DELETE CASCADE,
    total_beds INTEGER NOT NULL DEFAULT 0,
    available_beds INTEGER NOT NULL DEFAULT 0,
    occupied_beds INTEGER NOT NULL DEFAULT 0,
    total_icu_beds INTEGER NOT NULL DEFAULT 0,
    available_icu_beds INTEGER NOT NULL DEFAULT 0,
    occupied_icu_beds INTEGER NOT NULL DEFAULT 0,
    total_ventilators INTEGER NOT NULL DEFAULT 0,
    available_ventilators INTEGER NOT NULL DEFAULT 0,
    operating_rooms_available INTEGER DEFAULT 0,
    emergency_occupancy_percentage DECIMAL(5, 2) DEFAULT 0.00,
    reported_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capacity_facility_date ON facility_capacity_reports(facility_id, reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_capacity_reported_at ON facility_capacity_reports(reported_at DESC);

-- View representing the latest capacity report per facility
CREATE OR REPLACE VIEW v_facility_current_capacity AS
SELECT DISTINCT ON (facility_id)
    facility_id,
    total_beds,
    available_beds,
    occupied_beds,
    total_icu_beds,
    available_icu_beds,
    occupied_icu_beds,
    total_ventilators,
    available_ventilators,
    operating_rooms_available,
    emergency_occupancy_percentage,
    reported_at
FROM facility_capacity_reports
ORDER BY facility_id, reported_at DESC;
