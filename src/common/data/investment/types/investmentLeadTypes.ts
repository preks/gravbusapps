/**
 * Investment Lead Types
 * IRM-specific lead interfaces
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'

/**
 * Investment Lead Reference
 */
export interface InvestmentLeadRef {
  id: string
  code: string
  firstName?: string
  lastName?: string
  email?: string
}

/**
 * Base Investment Lead (from GraphQL/Database)
 * Extends CommonLead with IRM-specific fields
 */
export interface BaseInvestmentLead extends CommonLead {
  type?: LeadType
  notesSummary?: string

  // TODO Integration: Investment has different field names
  email?: string // @deprecated - use communicationChannels
  phone?: string // @deprecated - use communicationChannels
  position?: string // Maps to jobPosition in CommonLead

  // Investment-specific catalog references
  salutation?: CatalogEntry
  leadRating?: CatalogEntry // Maps to rating in CommonLead
  leadStatus?: CatalogEntry // Maps to status in CommonLead
  leadSource?: CatalogEntry // Maps to source in CommonLead
  industryClass?: CatalogEntry // Maps to industry in CommonLead
}

/**
 * Investment Lead (with computed fields for UI)
 */
export interface InvestmentLead extends BaseInvestmentLead {
  displayName: string
  salutationLabel?: string
  leadRatingLabel?: string
  leadStatusLabel?: string
  leadSourceLabel?: string
  industryClassLabel?: string
  ownerDisplayName?: string
}
