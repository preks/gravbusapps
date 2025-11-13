/**
 * Investment Communication Channel Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './investmentEnums'

/**
 * InvestmentCommunicationChannel
 * Communication channel entity for IRM
 */
export interface InvestmentCommunicationChannel extends BaseEntity {
  id: string
  source?: SourceTable
  value?: string
  valueExtension?: string

  // Catalog references
  communicationChannel?: CatalogEntry
  communicationChannelRef?: string

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
