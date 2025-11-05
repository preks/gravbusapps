/**
 * Investment Address Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { AddressType, SourceTable } from './investmentEnums'

/**
 * InvestmentAddress
 * Address entity for IRM
 */
export interface InvestmentAddress extends BaseEntity {
  id: string
  source?: SourceTable
  addressType?: AddressType
  addressLine?: any // Jsonb
  postalCode?: string
  locality?: string

  // Catalog references
  region?: CatalogEntry
  regionRef?: string
  country?: CatalogEntry
  countryRef?: string

  // Entity references
  account?: any // InvestmentAccount
  accountId?: string
  contact?: any // InvestmentContact
  contactId?: string
  opportunity?: any // InvestmentOpportunity
  opportunityId?: string
  lead?: any // InvestmentLead
  leadId?: string
}
