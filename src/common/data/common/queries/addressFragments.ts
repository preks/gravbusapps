/**
 * Common Address Fragment (REF)
 *
 * Base address fields for IRM (uses "locality").
 * Does NOT include entity relations to avoid recursive loops.
 * Catalog entries are always safe to include.
 *
 * NOTE: CRM uses "city" instead of "locality", so CRM must define its own address structure inline.
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * ADDRESS_REF
 * Core fields for IRM addresses (uses "locality")
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
