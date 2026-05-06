/**
 * Customer Contact Types
 * CustomerContact and related reference types
 */

import {
  type Contact,
  ContactFields,
  createContactDescriptors,
  contactFormFields
} from '@/common/data/relations/types/contactTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { filterCommunicationChannels } from '@/common/data/common/utils/entityPayloadHelpers'
import { splitAccountContactDrafts } from '@/common/data/common/utils/inlineDraftHelpers'
import type { CustomerActivity } from './customerActivityTypes'
import type { CustomerAddress } from './customerAddressTypes'
import type { CustomerCommunicationChannel } from './customerCommunicationChannelTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerNote } from './customerNoteTypes'
import type { CustomerAccountContact, CustomerOpportunityContact } from './customerRelationTypes'
import type { CustomerTask } from './customerTaskTypes'
import { toCustomerAccount } from './customerAccountTypes'

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

  // CRM-specific fields
  salesCampaign: any
  salesCampaignId?: string // Sales campaign association
}

/**
 * Customer Contact Query Field Mapping
 * Extends ContactFields with CRM-specific GraphQL field names
 */
export const CustomerContactFields = {
  ...ContactFields,
  // Override CRM-specific field names
  description: 'bio',
  jobPosition: 'jobTitle',
  leads: 'lead', // CRM uses singular "lead"
  picture: 'pictureUrl',
  pictureThumbnail: 'pictureThumbnailUrl',

  // CRM-specific fields
  salesCampaignId: 'salesCampaign'
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
    d => !['contact', 'description', 'fullName', 'notes', 'leads', 'jobPositions'].includes(d.key)
  ),

  // CRM-specific structural overrides
  {
    key: 'contact',
    searchPaths: [CustomerContactFields.firstName, CustomerContactFields.lastName],
    sortPaths: [CustomerContactFields.firstName, CustomerContactFields.lastName],
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
  },
  {
    key: 'jobPositions',
    path: CustomerContactFields.jobPosition, // CRM uses 'jobTitle' in backend
    filterLabel: 'Job Position',
    optionSelectPaths: [CustomerContactFields.jobPosition],
    optionSearchPaths: [CustomerContactFields.jobPosition],
    optionDistinctOn: [CustomerContactFields.jobPosition],
    kind: 'inIds'
  }
]

/**
 * Customer Contact Form Fields Configuration
 * Extends contactFormFields with CRM-specific fields
 */
export const customerContactFormFields = {
  ...contactFormFields,
  // Override mappings for CRM field name differences
  description: 'bio', // Form uses 'bio', backend expects 'description' → map bio to description
  jobPosition: 'jobTitle', // Form uses 'jobTitle', backend expects 'jobTitle' → map jobPosition to jobTitle
  picture: 'pictureUrl', // Form uses 'pictureUrl', backend expects 'pictureUrl' → map picture to pictureUrl
  pictureThumbnail: 'pictureThumbnailUrl', // Form uses 'pictureThumbnailUrl', backend expects 'pictureThumbnailUrl'
  // CRM-specific fields
  salesCampaignId: 'salesCampaign'
} as const

/**
 * Build Customer Contact payload for CRM module
 *
 * Automatically handles:
 * - Field name mapping via customerContactFormFields (jobPosition → jobTitle, etc.)
 * - Empty value exclusion
 * - ID/version automatically included if present (determines update vs create)
 * - CRM-specific fields (salesCampaign, linkedinUrl, xingUrl, bio, workExperienceYears)
 *
 * @param contact - Partial CustomerContact entity (only fields provided by form)
 * @returns Payload object ready for API submission
 */
export const buildCustomerContactPayload = (contact: Partial<CustomerContact>) => {
  // Keep only existing selected associations under the parent contact. Inline-created drafts
  // are lifted to top-level `accounts` by the form submit handler.
  const { existingAccountContacts } = splitAccountContactDrafts(contact.accountContacts as any[] | undefined)
  const contactWithExistingAssociations: Partial<CustomerContact> = {
    ...contact,
    accountContacts: existingAccountContacts as CustomerContact['accountContacts']
  }

  // Build base payload using customerContactFormFields for field mapping
  const basePayload = buildPayload(contactWithExistingAssociations, customerContactFormFields)

  // Filter communication channels
  const filteredChannels = filterCommunicationChannels(basePayload.communicationChannels)
  if (filteredChannels) {
    basePayload.communicationChannels = filteredChannels
  } else {
    delete basePayload.communicationChannels
  }

  return {
    contact: basePayload
  }
}

/**
 * Transform CustomerContact (GraphQL response) to CustomerContact (enhanced with field mappings)
 *
 * Handles CRM-specific field name mappings (fallback only):
 * - jobTitle → jobPosition (fallback only)
 * - pictureUrl → picture (fallback only)
 * - pictureThumbnailUrl → pictureThumbnail (fallback only)
 * - bio → description (fallback only)
 * - lead → leads (fallback only)
 * - accountId/account → accountContacts array (CRM uses deprecated accountId instead of accountContacts)
 */
export function toCustomerContact(raw: any): CustomerContact {
  // Extract incorrectly named fields to exclude from spread
  const { jobTitle, lead, pictureUrl, pictureThumbnailUrl, bio, ...rest } = raw

  // Use accountContacts from GraphQL if available, otherwise fallback to deprecated accountId/account
  const accountContacts: CustomerAccountContact[] | undefined = raw.accountContacts
    ? raw.accountContacts.map((ac: any) => ({
        ...ac,
        account: ac.account ? toCustomerAccount(ac.account) : ac.account
      }))
    : undefined

  // Transform addresses array: convert addressLine from string to object (same logic as toCustomerLead)
  const addresses = raw.addresses?.map((addr: any) => ({
    ...addr,
    addressLine:
      typeof addr.addressLine === 'string'
        ? (() => {
            try {
              return JSON.parse(addr.addressLine)
            } catch {
              return undefined
            }
          })()
        : addr.addressLine
  }))

  return {
    ...rest,
    // Map only if target field doesn't already exist (fallback mapping)
    jobPosition: raw.jobPosition ?? jobTitle,
    picture: raw.picture ?? pictureUrl,
    pictureThumbnail: raw.pictureThumbnail ?? pictureThumbnailUrl,
    description: raw.description ?? bio,
    leads: raw.leads ?? lead,
    accountContacts: accountContacts,
    addresses: addresses
  } as CustomerContact
}
