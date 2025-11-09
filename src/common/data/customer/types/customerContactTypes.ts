/**
 * Customer Contact Types
 * CustomerContact and related reference types
 */

import type { Contact } from '@/common/data/relations/types/contactTypes'
import { ContactFields, createContactDescriptors } from '@/common/data/relations/types/contactTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
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
 * Extends Contact with Customer-specific types and base fields for mapping
 */
export interface CustomerContact extends Contact {
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
}

/**
 * Customer Contact Query Field Mapping
 * Extends ContactFields with CRM-specific GraphQL field names
 */
export const CustomerContactFields = {
  ...ContactFields,
  // Override CRM-specific field names
  jobPosition: 'jobTitle',
  leads: 'lead', // CRM uses singular "lead"
  picture: 'pictureUrl',
  pictureThumbnail: 'pictureThumbnailUrl',
  type: 'contactType'
} as const

export type CustomerContactFieldName = (typeof CustomerContactFields)[keyof typeof CustomerContactFields]

/**
 * Customer Contact Descriptors
 * Uses createContactDescriptors with CustomerContactFields mapping
 * Filters out and overrides descriptors with structural differences (CRM uses different nested field names)
 */
export const CUSTOMER_CONTACT_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors that need structural overrides
  ...createContactDescriptors(CustomerContactFields as Record<keyof typeof ContactFields, string>).filter(
    d => !['addresses', 'description', 'fullName', 'notes', 'leads'].includes(d.key)
  ),

  // CRM-specific structural overrides
  {
    key: 'addresses',
    searchPaths: [
      'addresses.city', // CRM uses "city" not "locality"
      'addresses.postalCode',
      'addresses.region.value',
      'addresses.country.value'
    ],
    sortPaths: ['addresses.city', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    type: 'text'
  },
  {
    key: 'notes',
    searchPaths: ['notes.noteTitle', 'notes.noteText'], // CRM uses "noteTitle"/"noteText"
    sortPaths: ['notes.noteTitle', 'notes.noteText'],
    type: 'text'
  },
  {
    key: 'leads',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'], // CRM uses singular "lead"
    sortPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    type: 'text'
  }
]
