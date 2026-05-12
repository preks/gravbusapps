/**
 * Investment Address Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { Address } from '@/common/data/common/types/commonTypes'
import type { AddressType, SourceTable } from './investmentEnums'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import type { InvestmentCompany } from './investmentCompanyTypes'

/**
 * InvestmentAddress
 * Address entity for IRM
 * Extends Address from common types
 */
export interface InvestmentAddress extends BaseEntity, Address {
  source?: SourceTable
  addressType?: AddressType

  // Entity references
  account?: any // InvestmentAccount
  accountId?: string
  contact?: any // InvestmentContact
  contactId?: string
  opportunity?: any // InvestmentOpportunity
  opportunityId?: string
  lead?: any // InvestmentLead
  leadId?: string
  investmentCompany?: InvestmentCompany
  investmentCompanyId?: string
}

export const InvestmentAddressFields = {
  id: 'id',
  addressType: 'addressType',
  addressLine: 'addressLine',
  locality: 'locality',
  postalCode: 'postalCode',
  region: 'region',
  regionRef: 'regionRef',
  country: 'country',
  countryRef: 'countryRef',
  account: 'account',
  accountId: 'accountId',
  contact: 'contact',
  contactId: 'contactId',
  opportunity: 'opportunity',
  opportunityId: 'opportunityId',
  lead: 'lead',
  leadId: 'leadId',
  investmentCompany: 'investmentCompany',
  investmentCompanyId: 'investmentCompanyId'
} as const

/**
 * Investment Address Fragment
 * GraphQL fragment for Investment Address entities (IRM uses "locality")
 */
export const INVESTMENT_ADDRESS_FRAGMENT = `
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
