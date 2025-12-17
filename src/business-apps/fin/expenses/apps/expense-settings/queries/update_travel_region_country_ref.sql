-- SQL Query to update object_value.destination_country_ref for TravelRegion catalog entries
-- Pattern: DE-AU-002 -> extract AU (middle segment)
-- Pattern: DE-BB-000 -> extract BB (middle segment)

-- First, let's preview what will be updated
SELECT 
    ce.id,
    ce.code,
    ce.value,
    ce.object_value,
    c.identifier as catalog_identifier,
    CASE 
        WHEN ce.code LIKE '%-%-%' THEN 
            SPLIT_PART(ce.code, '-', 2)  -- Extract middle segment
        ELSE 
            ce.code  -- Use full code if no hyphens
    END as extracted_country_code,
    jsonb_build_object(
        'destination_country_ref', 
        'Country:v1:' || CASE 
            WHEN ce.code LIKE '%-%-%' THEN SPLIT_PART(ce.code, '-', 2)
            ELSE ce.code
        END
    ) as new_object_value
FROM catalog_entry ce
JOIN catalog c ON ce.catalog_id = c.id
WHERE c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
ORDER BY ce.code;

-- Option 1: Update ONLY entries without destination_country_ref (safe, only new entries)
/*
UPDATE catalog_entry ce
SET object_value = jsonb_build_object(
    'destination_country_ref', 
    'Country:v1:' || CASE 
        WHEN ce.code LIKE '%-%-%' THEN SPLIT_PART(ce.code, '-', 2)  -- Extract middle segment
        ELSE ce.code  -- Use full code if no hyphens
    END
)
FROM catalog c
WHERE ce.catalog_id = c.id
  AND c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
  AND (ce.object_value IS NULL OR ce.object_value->>'destination_country_ref' IS NULL);
*/

-- Option 2: Update ALL TravelRegion entries (overwrites existing destination_country_ref)
/*
UPDATE catalog_entry ce
SET object_value = jsonb_build_object(
    'destination_country_ref', 
    'Country:v1:' || CASE 
        WHEN ce.code LIKE '%-%-%' THEN SPLIT_PART(ce.code, '-', 2)  -- Extract middle segment
        ELSE ce.code  -- Use full code if no hyphens
    END
)
FROM catalog c
WHERE ce.catalog_id = c.id
  AND c.identifier = 'TravelRegion'
  AND ce.is_deleted = false;
*/

-- Option 3: Update ALL and preserve other fields in object_value (recommended)
/*
UPDATE catalog_entry ce
SET object_value = COALESCE(ce.object_value, '{}'::jsonb) || jsonb_build_object(
    'destination_country_ref', 
    'Country:v1:' || CASE 
        WHEN ce.code LIKE '%-%-%' THEN SPLIT_PART(ce.code, '-', 2)  -- Extract middle segment
        ELSE ce.code  -- Use full code if no hyphens
    END
)
FROM catalog c
WHERE ce.catalog_id = c.id
  AND c.identifier = 'TravelRegion'
  AND ce.is_deleted = false;
*/

-- Verify the update
SELECT 
    ce.id,
    ce.code,
    ce.value,
    ce.object_value,
    ce.object_value->>'destination_country_ref' as destination_country_ref
FROM catalog_entry ce
JOIN catalog c ON ce.catalog_id = c.id
WHERE c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
ORDER BY ce.code;

