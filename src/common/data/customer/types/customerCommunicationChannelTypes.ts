/**
 * Customer Communication Channel Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'

/**
 * CustomerCommunicationChannel
 * Communication channel entity for CRM (sales_communication_channel table)
 */
export interface CustomerCommunicationChannel extends BaseEntity {
  id: string
  value?: string
  valueExtension?: string

  // Catalog references
  communicationChannel?: CatalogEntry
  communicationChannelRef?: string

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
