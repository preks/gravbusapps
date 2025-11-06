import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'
import { COMMON_CONTACT_DESCRIPTORS } from '@/common/data/relations/types/commonContactTypes'
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
 * Investment Contact Descriptors
 * IRM uses correct field names, so we use Common descriptors directly
 */
export const INVESTMENT_CONTACT_DESCRIPTORS: Descriptor[] = [...COMMON_CONTACT_DESCRIPTORS]
