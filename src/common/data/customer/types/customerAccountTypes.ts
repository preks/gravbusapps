/**
 * Customer Account Types
 */

import type { CommonAccount, CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'
import type { CustomerContact, CustomerAccountContact } from './'
/**
 * Customer Account Type
 * Extends CommonAccount with CRM-specific fields
 */
export interface CustomerAccount extends CommonAccount {
  // CRM-specific fields from GraphQL schema
  ownerOrganization?: any // OrganizationalUnit
  ownerOrganizationId?: string

  // Sales campaign (GraphQL field names)
  salesCampaign?: any // SalesCampaign
  salesCampaignId?: string

  // Mapped to common naming in mapper
  customerCampaign?: any // Mapped from salesCampaign
  customerCampaignId?: string // Mapped from salesCampaignId

  // CRM-specific relations
  contact?: CustomerContact[] // Contact[] - direct relation in CRM
  accountContacts?: CustomerAccountContact[] // AccountContact[] - join table

  // CRM uses different aggregate names
  crmAddress?: any[] // Duplicate of addresses

  crmDocument?: any[] // Duplicate of documents
  crmNote?: any[] // Duplicate of notes
  tags?: any[] // SalesTag[]
}

/**
 * Customer Account Filters Interface
 * Extends common filters with CRM-specific filters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CustomerAccountFilters extends CommonAccountFilters {
  // Customer-specific filters can be added here if needed
}
