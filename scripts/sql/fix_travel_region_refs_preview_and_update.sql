-- =============================================================================
-- Travel Region Ref Fix - Preview + Update (CloudBeaver/PostgreSQL compatible)
-- =============================================================================
--
-- What this script does:
-- 1) PREVIEW: shows which allowance_region_rule_detail rows are OK / ambiguous / updatable
-- 2) UPDATE : updates only SAFE rows (single unambiguous candidate)
--
-- How to use:
-- - Pick exactly one config in the "params" CTE below.
-- - Run PREVIEW first.
-- - Review rows with status = 'WILL_UPDATE_SAFE'.
-- - Run UPDATE section.
--
-- Rule set mapping:
-- - NW_DE -> TRS_DE
-- - NW_RO + SG_02 -> TRS_RO
-- - NW_US -> TRS_US
--
-- Notes:
-- - No ':' placeholders are used (CloudBeaver-safe).
-- - This script uses first_allowance_region_rule_id only, as requested.
-- - Rows with multiple candidates are NOT updated by design.
--
-- =============================================================================
-- PREVIEW
-- =============================================================================

WITH params AS (
    -- Choose ONE of the following lines and keep others commented:

    SELECT ARRAY['NW_DE']::text[] AS rule_codes, 'TRS_DE'::text AS travel_set_code
    -- SELECT ARRAY['NW_RO', 'SG_02']::text[] AS rule_codes, 'TRS_RO'::text AS travel_set_code
    -- SELECT ARRAY['NW_US']::text[] AS rule_codes, 'TRS_US'::text AS travel_set_code
),
expense_rules AS (
    SELECT er.id, er.code
    FROM nw_employee_expense.expense_rule er
    CROSS JOIN params p
    WHERE er.code = ANY (p.rule_codes)
      AND COALESCE(er.is_deleted, false) = false
),
allowance_rule_ids AS (
    SELECT DISTINCT
        erac.first_allowance_region_rule_id AS allowance_region_rule_id,
        er.code AS expense_rule_code
    FROM nw_employee_expense.expense_rule_allowance_code erac
    JOIN expense_rules er
      ON er.id = erac.expense_rule_id
    WHERE erac.first_allowance_region_rule_id IS NOT NULL
      AND COALESCE(erac.is_deleted, false) = false
),
region_details AS (
    SELECT
        arrd.id,
        arrd.allowance_region_rule_id,
        ar.expense_rule_code,
        arrd.country_ref,
        arrd.travel_region_ref
    FROM nw_employee_expense.allowance_region_rule_detail arrd
    JOIN allowance_rule_ids ar
      ON ar.allowance_region_rule_id = arrd.allowance_region_rule_id
    WHERE COALESCE(arrd.is_deleted, false) = false
),
travel_region_candidates AS (
    SELECT
        ce.id AS candidate_travel_region_ref,
        ce.code AS candidate_code,
        ce.object_value ->> 'destination_country_ref' AS destination_country_ref
    FROM nw_catalog.catalog c
    JOIN nw_catalog.catalog_entry ce
      ON ce.catalog_id = c.id
    CROSS JOIN params p
    WHERE c.identifier = 'TravelRegion'
      AND ce.parent_entry_id = ('TravelRegionSet:v1:' || p.travel_set_code)
      AND COALESCE(ce.is_deleted, false) = false
      AND ce.object_value ? 'destination_country_ref'
),
candidate_ranked AS (
    SELECT
        trc.destination_country_ref,
        trc.candidate_travel_region_ref,
        trc.candidate_code,
        ROW_NUMBER() OVER (
            PARTITION BY trc.destination_country_ref
            ORDER BY trc.candidate_code, trc.candidate_travel_region_ref
        ) AS rn
    FROM travel_region_candidates trc
),
match_stats AS (
    SELECT
        rd.id,
        rd.allowance_region_rule_id,
        rd.expense_rule_code,
        rd.country_ref,
        rd.travel_region_ref AS current_value,
        COUNT(trc.candidate_travel_region_ref) AS candidate_count,
        BOOL_OR(trc.candidate_travel_region_ref = rd.travel_region_ref) AS current_is_valid
    FROM region_details rd
    LEFT JOIN travel_region_candidates trc
      ON trc.destination_country_ref = rd.country_ref
    GROUP BY
        rd.id, rd.allowance_region_rule_id, rd.expense_rule_code, rd.country_ref, rd.travel_region_ref
)
SELECT
    ms.id,
    ms.allowance_region_rule_id,
    ms.expense_rule_code,
    ms.country_ref,
    ms.current_value,
    cr.candidate_travel_region_ref AS expected_value_if_single,
    ms.candidate_count,
    CASE
        WHEN ms.candidate_count = 0 THEN 'NO_CANDIDATE'
        WHEN ms.current_is_valid THEN 'OK'
        WHEN ms.candidate_count > 1 THEN 'AMBIGUOUS_MULTIPLE_CANDIDATES'
        ELSE 'WILL_UPDATE_SAFE'
    END AS status
FROM match_stats ms
LEFT JOIN candidate_ranked cr
  ON cr.destination_country_ref = ms.country_ref
 AND cr.rn = 1
ORDER BY status, ms.expense_rule_code, ms.country_ref, ms.id;

-- =============================================================================
-- UPDATE (SAFE ONLY)
-- =============================================================================
-- Updates only rows where:
-- - current travel_region_ref is invalid
-- - exactly one candidate exists for that country in the selected travel set
--
-- Tip: wrap this UPDATE in BEGIN/ROLLBACK to test first, then COMMIT.

WITH params AS (
    -- Choose ONE of the following lines and keep others commented:

    SELECT ARRAY['NW_DE']::text[] AS rule_codes, 'TRS_DE'::text AS travel_set_code
    -- SELECT ARRAY['NW_RO', 'SG_02']::text[] AS rule_codes, 'TRS_RO'::text AS travel_set_code
    -- SELECT ARRAY['NW_US']::text[] AS rule_codes, 'TRS_US'::text AS travel_set_code
),
expense_rules AS (
    SELECT er.id
    FROM nw_employee_expense.expense_rule er
    CROSS JOIN params p
    WHERE er.code = ANY (p.rule_codes)
      AND COALESCE(er.is_deleted, false) = false
),
allowance_rule_ids AS (
    SELECT DISTINCT erac.first_allowance_region_rule_id AS allowance_region_rule_id
    FROM nw_employee_expense.expense_rule_allowance_code erac
    JOIN expense_rules er
      ON er.id = erac.expense_rule_id
    WHERE erac.first_allowance_region_rule_id IS NOT NULL
      AND COALESCE(erac.is_deleted, false) = false
),
region_details AS (
    SELECT
        arrd.id,
        arrd.country_ref,
        arrd.travel_region_ref
    FROM nw_employee_expense.allowance_region_rule_detail arrd
    JOIN allowance_rule_ids ar
      ON ar.allowance_region_rule_id = arrd.allowance_region_rule_id
    WHERE COALESCE(arrd.is_deleted, false) = false
),
travel_region_candidates AS (
    SELECT
        ce.id AS candidate_travel_region_ref,
        ce.code AS candidate_code,
        ce.object_value ->> 'destination_country_ref' AS destination_country_ref
    FROM nw_catalog.catalog c
    JOIN nw_catalog.catalog_entry ce
      ON ce.catalog_id = c.id
    CROSS JOIN params p
    WHERE c.identifier = 'TravelRegion'
      AND ce.parent_entry_id = ('TravelRegionSet:v1:' || p.travel_set_code)
      AND COALESCE(ce.is_deleted, false) = false
      AND ce.object_value ? 'destination_country_ref'
),
candidate_ranked AS (
    SELECT
        trc.destination_country_ref,
        trc.candidate_travel_region_ref,
        ROW_NUMBER() OVER (
            PARTITION BY trc.destination_country_ref
            ORDER BY trc.candidate_code, trc.candidate_travel_region_ref
        ) AS rn
    FROM travel_region_candidates trc
),
match_stats AS (
    SELECT
        rd.id,
        rd.country_ref,
        rd.travel_region_ref,
        COUNT(trc.candidate_travel_region_ref) AS candidate_count,
        BOOL_OR(trc.candidate_travel_region_ref = rd.travel_region_ref) AS current_is_valid
    FROM region_details rd
    LEFT JOIN travel_region_candidates trc
      ON trc.destination_country_ref = rd.country_ref
    GROUP BY rd.id, rd.country_ref, rd.travel_region_ref
),
to_update AS (
    SELECT
        ms.id,
        cr.candidate_travel_region_ref AS new_travel_region_ref
    FROM match_stats ms
    JOIN candidate_ranked cr
      ON cr.destination_country_ref = ms.country_ref
     AND cr.rn = 1
    WHERE ms.candidate_count = 1
      AND ms.current_is_valid = false
)
UPDATE nw_employee_expense.allowance_region_rule_detail arrd
SET travel_region_ref = tu.new_travel_region_ref
FROM to_update tu
WHERE arrd.id = tu.id
RETURNING
    arrd.id,
    arrd.country_ref,
    arrd.travel_region_ref AS updated_travel_region_ref;
