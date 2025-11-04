/**
 * Customer Lead Types
 * CRM-specific lead interfaces
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'

/**
 * Customer Lead Reference
 */
export interface CustomerLeadRef {
  id: string
  code: string
  firstName?: string
  lastName?: string
  email?: string
}

/**
 * Base Customer Lead (from GraphQL/Database)
 * Extends CommonLead with CRM-specific fields
 */
export interface BaseCustomerLead extends CommonLead {
  // TODO Integration: Customer has different field names
  email?: string // @deprecated - use communicationChannels
  phoneNumber?: string // @deprecated - use communicationChannels
  position?: string // Maps to jobPosition in CommonLead
  companyEmail?: string
  companyPhone?: string
  companyWebsite?: string
  conversionDate?: string

  // Customer-specific catalog references
  academicTitle?: CatalogEntry
  salutation?: CatalogEntry
  leadRating?: CatalogEntry // Maps to rating in CommonLead
  leadStatus?: CatalogEntry // Maps to status in CommonLead
  leadSource?: CatalogEntry // Maps to source in CommonLead
  industryClass?: CatalogEntry // Maps to industry in CommonLead
  companySize?: CatalogEntry
}

/**
 * Customer Lead (with computed fields for UI)
 */
export interface CustomerLead extends BaseCustomerLead {
  displayName: string
  salutationLabel?: string
  academicTitleLabel?: string
  leadRatingLabel?: string
  leadStatusLabel?: string
  leadSourceLabel?: string
  industryClassLabel?: string
  companySizeLabel?: string
  ownerDisplayName?: string
}
