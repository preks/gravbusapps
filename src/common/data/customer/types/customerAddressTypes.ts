/**
 * Customer Address Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { Address } from '@/common/data/common/types/commonTypes'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'

/**
 * CustomerAddress
 * Address entity for CRM (crm_address table)
 * Extends Address from common types
 */
export interface CustomerAddress extends BaseEntity, Address {
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
 * GraphQL fragment for Customer Address entities
 * Maps "city" to "locality" to match Address interface
 */
export const CUSTOMER_ADDRESS_FRAGMENT = `
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
