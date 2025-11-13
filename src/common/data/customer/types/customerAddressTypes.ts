/**
 * Customer Address Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * CustomerAddress
 * Address entity for CRM (crm_address table)
 */
export interface CustomerAddress extends BaseEntity {
  id: string
  addressType?: string
  addressLine?: any // Jsonb
  city?: string // CRM uses 'city' instead of 'locality'
  postalCode?: string

  // Catalog references
  region?: CatalogEntry
  regionRef?: string
  country?: CatalogEntry
  countryRef?: string

  // Entity references
  account?: any // CustomerAccount
  accountId?: string
  contact?: any // CustomerContact
  contactId?: string
  opportunity?: any // CustomerOpportunity
  opportunityId?: string
  lead?: any // CustomerLead
  leadId?: string
}

/**
 * Customer Address Fragment
 * GraphQL fragment for Customer Address entities (CRM uses "city" not "locality")
 */
export const CUSTOMER_ADDRESS_FRAGMENT = `
  id
  addressType
  addressLine
  city
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
