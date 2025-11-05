/**
 * Customer Relation Types - Backward Compatibility
 * Re-exports all types to maintain compatibility with existing code
 */

// Re-export main types (they are already the "enhanced" versions)
export type { CustomerAccount } from './customerAccountTypes'
export type { CustomerContact } from './customerContactTypes'
export type { CustomerTask } from './customerTaskTypes'
export type { CustomerLead } from './customerLeadTypes'
export type { CustomerOpportunity } from './customerOpportunityTypes'
export type { CustomerAddress } from './customerAddressTypes'
export type { CustomerCommunicationChannel } from './customerCommunicationChannelTypes'
export type { CustomerDocument } from './customerDocumentTypes'
export type { CustomerNote } from './customerNoteTypes'
export type { CustomerActivity } from './customerActivityTypes'

/**
 * Customer Account Contact Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { ContactType } from './customerEnums'
import type { CustomerAccount, CustomerContact } from './'

/**
 * CustomerAccountContact
 * Join table entity for Account-Contact relationship (account_contact table)
 */
export interface CustomerAccountContact extends BaseEntity {
  id: string
  contactType?: ContactType

  // Entity references
  account?: CustomerAccount // CustomerAccount
  accountId?: string
  contact?: CustomerContact // CustomerContact
  contactId?: string
}
