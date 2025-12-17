-- One-time SQL update to fix AllowanceRegionRuleDetail.country_ref
-- based on TravelRegion's object_value.destination_country_ref
--
-- This updates existing detail records to use the correct country reference
-- from their associated TravelRegion's objectValue

-- Preview query: See what will be updated
SELECT 
    arrd.id as detail_id,
    arrd.travel_region_ref,
    arrd.country_ref as current_country_ref,
    ce.code as travel_region_code,
    ce.value as travel_region_name,
    ce.object_value->>'destination_country_ref' as new_country_ref,
    CASE 
        WHEN arrd.country_ref = ce.object_value->>'destination_country_ref' THEN '✓ Already Correct'
        WHEN arrd.country_ref IS NULL THEN '⚠ NULL - Will Update'
        ELSE '❌ Wrong - Will Update'
    END as status
FROM allowance_region_rule_detail arrd
JOIN catalog_entry ce ON arrd.travel_region_ref = ce.id
JOIN catalog c ON ce.catalog_id = c.id
WHERE c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
  AND ce.object_value->>'destination_country_ref' IS NOT NULL
ORDER BY status DESC, ce.code;

-- Count by status
SELECT 
    CASE 
        WHEN arrd.country_ref = ce.object_value->>'destination_country_ref' THEN 'Already Correct'
        WHEN arrd.country_ref IS NULL THEN 'NULL - Needs Update'
        ELSE 'Wrong - Needs Update'
    END as status,
    COUNT(*) as count
FROM allowance_region_rule_detail arrd
JOIN catalog_entry ce ON arrd.travel_region_ref = ce.id
JOIN catalog c ON ce.catalog_id = c.id
WHERE c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
  AND ce.object_value->>'destination_country_ref' IS NOT NULL
GROUP BY status
ORDER BY status;

-- Actual UPDATE query (uncomment to run)
/*
UPDATE allowance_region_rule_detail arrd
SET country_ref = ce.object_value->>'destination_country_ref'
FROM catalog_entry ce
JOIN catalog c ON ce.catalog_id = c.id
WHERE arrd.travel_region_ref = ce.id
  AND c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
  AND ce.object_value->>'destination_country_ref' IS NOT NULL
  AND (
    arrd.country_ref IS NULL 
    OR arrd.country_ref != ce.object_value->>'destination_country_ref'
  );
*/

-- Verify the update
/*
SELECT 
    arrd.id,
    arrd.travel_region_ref,
    arrd.country_ref,
    ce.code as travel_region_code,
    ce.object_value->>'destination_country_ref' as expected_country_ref,
    CASE 
        WHEN arrd.country_ref = ce.object_value->>'destination_country_ref' THEN '✓ Correct'
        ELSE '❌ Still Wrong'
    END as status
FROM allowance_region_rule_detail arrd
JOIN catalog_entry ce ON arrd.travel_region_ref = ce.id
JOIN catalog c ON ce.catalog_id = c.id
WHERE c.identifier = 'TravelRegion'
  AND ce.is_deleted = false
ORDER BY ce.code
LIMIT 100;
*/
