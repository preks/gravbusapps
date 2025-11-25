/**
 * Common Address Fragment (REF)
 *
 * Base address fields using "locality" (standardized across IRM and CRM).
 * CRM uses GraphQL alias "locality: city" to map to standard field name.
 * Does NOT include entity relations to avoid recursive loops.
 * Catalog entries are always safe to include.
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * ADDRESS_REF
 * Core address fields using "locality" (standardized)
 * Includes catalog entries, no entity relations
 */
export const ADDRESS_REF = `
  id
  addressType
  addressLine
  locality
  postalCode
  ${AUDIT_FIELDS}
  
  region {
    ${CATALOG_ENTRY}
  }
  regionRef
  
  country {
    ${CATALOG_ENTRY}
  }
  countryRef
`
