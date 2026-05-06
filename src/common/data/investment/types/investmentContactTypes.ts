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
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentAccountContact, InvestmentOpportunityContact } from './investmentRelationTypes'
import type { InvestmentTask } from './investmentTaskTypes'

export interface InvestmentContact extends Contact {
  accountContacts?: InvestmentAccountContact[]
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  documents?: InvestmentDocument[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunityContacts?: InvestmentOpportunityContact[]
  tasks?: InvestmentTask[]

  // IRM-specific fields
  userId?: string // Keycloak user ID for portal users
}

/**
 * Investment Contact Query Field Mapping
 * Extends ContactFields with IRM-specific GraphQL field names
 */
export const InvestmentContactFields = {
  ...ContactFields,
  // Override IRM-specific field names
  accountContacts: 'investmentAccountContact',
  leads: 'investmentLead',
  opportunityContacts: 'investmentOpportunityContact',
  // IRM-specific fields
  userId: 'userId'
} as const

/**
 * Investment Contact Descriptors
 * Uses createContactDescriptors with InvestmentContactFields mapping
 */
export const INVESTMENT_CONTACT_DESCRIPTORS: Descriptor[] = [
  ...createContactDescriptors(InvestmentContactFields as Record<keyof typeof ContactFields, string>),
  // IRM-specific descriptors
  {
    key: 'userIds',
    path: InvestmentContactFields.userId,
    filterLabel: 'User',
    kind: 'inIds'
  }
]

/**
 * Investment Contact Form Fields Configuration
 * Extends contactFormFields with IRM-specific fields
 */
export const investmentContactFormFields = {
  ...contactFormFields,
  // IRM-specific fields
  userId: 'userId'
} as const

/**
 * Build Investment Contact payload for IRM module
 *
 * Automatically handles:
 * - Field name mapping via investmentContactFormFields
 * - Empty value exclusion
 * - ID/version automatically included if present (determines update vs create)
 * - IRM-specific fields (sensitive, additionalProperties, tags)
 *
 * @param contact - Partial InvestmentContact entity (only fields provided by form)
 * @returns Payload object ready for API submission
 */
export const buildInvestmentContactPayload = (contact: Partial<InvestmentContact>) => {
  // Keep only existing selected associations under the parent contact. Inline-created drafts
  // are lifted to top-level `investmentAccounts` by the form submit handler.
  const { existingAccountContacts } = splitAccountContactDrafts(contact.accountContacts as any[] | undefined)
  const contactWithExistingAssociations: Partial<InvestmentContact> = {
    ...contact,
    accountContacts: existingAccountContacts as InvestmentContact['accountContacts']
  }

  // Build base payload using investmentContactFormFields for field mapping
  const basePayload = buildPayload(contactWithExistingAssociations, investmentContactFormFields)

  // Filter communication channels
  const filteredChannels = filterCommunicationChannels(basePayload.communicationChannels)
  if (filteredChannels) {
    basePayload.communicationChannels = filteredChannels
  } else {
    delete basePayload.communicationChannels
  }

  return {
    investmentContact: basePayload
  }
}

/**
 * Transform InvestmentContact (GraphQL response) to InvestmentContact (enhanced with field mappings)
 *
 * Handles IRM-prefixed field name mappings (fallback only):
 * - investmentAccountContact → accountContacts (fallback only)
 * - investmentLead → leads (fallback only)
 * - investmentOpportunityContact → opportunityContacts (fallback only)
 */
export function toInvestmentContact(raw: any): InvestmentContact {
  // Extract incorrectly named fields to exclude from spread
  const { investmentAccountContact, investmentLead, investmentOpportunityContact, ...rest } = raw

  return {
    ...rest,
    // Map only if target field doesn't already exist (fallback mapping)
    accountContacts: raw.accountContacts ?? investmentAccountContact,
    leads: raw.leads ?? investmentLead,
    opportunityContacts: raw.opportunityContacts ?? investmentOpportunityContact
  } as InvestmentContact
}
