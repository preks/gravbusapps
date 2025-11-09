import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'
import { ContactFields, createCommonContactDescriptors } from '@/common/data/relations/types/commonContactTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentAccountContact, InvestmentOpportunityContact } from './investmentRelationTypes'
import type { InvestmentTask } from './investmentTaskTypes'

export interface InvestmentContact extends CommonContact {
  accountContacts?: InvestmentAccountContact[]
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  documents?: InvestmentDocument[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunityContacts?: InvestmentOpportunityContact[]
  tasks?: InvestmentTask[]

  // Base fields for mapping
  investmentAccountContact?: InvestmentAccountContact[] // Mapped to accountContacts
  investmentLead?: InvestmentLead[] // Mapped to leads
  investmentOpportunityContact?: InvestmentOpportunityContact[] // Mapped to opportunityContacts
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
  opportunityContacts: 'investmentOpportunityContact'
} as const

export type InvestmentContactFieldName = (typeof InvestmentContactFields)[keyof typeof InvestmentContactFields]

/**
 * Investment Contact Descriptors
 * Uses createCommonContactDescriptors with InvestmentContactFields mapping
 */
export const INVESTMENT_CONTACT_DESCRIPTORS: Descriptor[] = [
  ...createCommonContactDescriptors(InvestmentContactFields as Record<keyof typeof ContactFields, string>)
]
