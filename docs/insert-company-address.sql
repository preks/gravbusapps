-- =============================================================================
-- INSERT a new company_address record (PostgreSQL / Hasura)
-- =============================================================================
-- Replace:
--   YOUR_COMPANY_UUID   with the actual company id (uuid)
--   street address      with the real address line(s)
--   City name           with locality
--  12345                with postal code
--  region_ref / country_ref  with catalog entry UUIDs if you use them (or NULL)
--
-- If your table/columns use different names, adjust (e.g. camelCase in DB).
-- =============================================================================

INSERT INTO company_address (
  id,
  company_id,
  address_line,
  address_type,
  locality,
  postal_code,
  created_at,
  updated_at,
  is_deleted,
  version,
  region_ref,
  country_ref
) VALUES (
  gen_random_uuid(),                    -- id (or use a fixed UUID)
  'YOUR_COMPANY_UUID'::uuid,           -- company_id – replace with real company UUID
  '{"streetAddress": "Street name 123", "addressLine2": ""}'::jsonb,  -- address_line (jsonb)
  'HEADQUARTERS',                      -- address_type (e.g. HEADQUARTERS, BRANCH – match your catalog if used)
  'City name',                         -- locality
  '12345',                             -- postal_code
  now(),                               -- created_at
  now(),                               -- updated_at
  false,                               -- is_deleted (false so it appears in the app)
  1,                                   -- version (increment on update if you use optimistic locking)
  NULL,                                -- region_ref (UUID of region catalog entry, or NULL)
  NULL                                 -- country_ref (UUID of country catalog entry, or NULL)
);

-- =============================================================================
-- Minimal version (only required / commonly used columns)
-- =============================================================================
-- INSERT INTO company_address (id, company_id, address_line, locality, postal_code, created_at, updated_at, is_deleted, version)
-- VALUES (
--   gen_random_uuid(),
--   'YOUR_COMPANY_UUID'::uuid,
--   '{"streetAddress": "Street name 123"}'::jsonb,
--   'City name',
--   '12345',
--   now(),
--   now(),
--   false,
--   1
-- );
