/**
 * Customer Address Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'

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
