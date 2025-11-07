/**
 * Customer Contact Types
 * CustomerContact and related reference types
 */

import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'
import { COMMON_CONTACT_DESCRIPTORS } from '@/common/data/relations/types/commonContactTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerActivity } from './customerActivityTypes'
import type { CustomerAddress } from './customerAddressTypes'
import type { CustomerCommunicationChannel } from './customerCommunicationChannelTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerNote } from './customerNoteTypes'
import type { CustomerAccountContact, CustomerOpportunityContact } from './customerRelationTypes'
import type { CustomerTask } from './customerTaskTypes'
import type { ContactType } from '@/common/data/relations/constants/commonContactConstants'

/**
 * Customer Contact Interface
 * Extends CommonContact with Customer-specific types and base fields for mapping
 */
export interface CustomerContact extends CommonContact {
  accountContacts?: CustomerAccountContact[]
  activities?: CustomerActivity[]
  addresses?: CustomerAddress[]
  communicationChannels?: CustomerCommunicationChannel[]
  documents?: CustomerDocument[]
  leads?: CustomerLead[]
  notes?: CustomerNote[]
  opportunityContacts?: CustomerOpportunityContact[]
  tasks?: CustomerTask[]

  // Base fields for mapping
  contactType?: ContactType // Mapped to type
  jobTitle?: string // Mapped to jobPosition
  lead?: CustomerLead // Mapped to leads (singular deprecated)
  leadId?: string // Mapped to leads relationship
  pictureUrl?: string // Mapped to picture
  pictureThumbnailUrl?: string // Mapped to pictureThumbnail
  // CRM deprecated fields (used to build accountContacts array)
  accountId?: string // Mapped to accountContacts
  account?: CustomerAccount // Mapped to accountContacts
}

/**
 * Customer Contact Descriptors
 * Extends Common descriptors with CRM-specific path overrides for wrong field names
 */
export const CUSTOMER_CONTACT_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors we need to override for CRM wrong field names
  ...COMMON_CONTACT_DESCRIPTORS.filter(
    d => !['jobPosition', 'picture', 'pictureThumbnail', 'type', 'account'].includes(d.key)
  ),

  // CRM-specific path overrides (key remains IRM-correct name, but paths use CRM field names)
  { key: 'jobPosition', searchPaths: ['jobTitle'], sortPath: 'jobTitle', type: 'text' }, // CRM: jobTitle
  { key: 'picture', searchPaths: ['pictureUrl'], sortPath: 'pictureUrl', type: 'text' }, // CRM: pictureUrl
  {
    key: 'pictureThumbnail',
    searchPaths: ['pictureThumbnailUrl'],
    sortPath: 'pictureThumbnailUrl',
    type: 'text'
  }, // CRM: pictureThumbnailUrl
  { key: 'type', searchPaths: ['contactType'], sortPath: 'contactType', type: 'text' }, // CRM: contactType
  // CRM uses deprecated accountId/account instead of accountContacts array
  {
    key: 'account',
    searchPaths: ['account.name'],
    sortPath: 'account.name',
    type: 'text'
  } // CRM: account.name (not accountContacts.account.name)
]
