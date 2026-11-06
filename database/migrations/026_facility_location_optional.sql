-- CareConnect Ethiopia - Allow optional GPS coordinates for healthcare facilities
-- Version: 026
-- Description: Makes latitude and longitude optional to support facilities with incomplete GIS data

DO $$
BEGIN
    ALTER TABLE healthcare_facilities ALTER COLUMN latitude DROP NOT NULL;
    ALTER TABLE healthcare_facilities ALTER COLUMN longitude DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
