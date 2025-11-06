/**
 * Investment Opportunity Types
 */

import type {
  CommonOpportunity,
  CommonOpportunityStageCondition
} from '@/common/data/relations/types/commonOpportunityTypes'
import { COMMON_OPPORTUNITY_DESCRIPTORS } from '@/common/data/relations/types/commonOpportunityTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunityContact } from './investmentRelationTypes'
import type { Investment } from './investmentTypes'

/**
 * Investment Opportunity Type
 * Extends CommonOpportunity with IRM-specific fields and proper type mappings
 */
export interface InvestmentOpportunity extends CommonOpportunity {
  // Map any types from CommonOpportunity to specific Investment types
  account?: InvestmentAccount
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  divestment?: Investment
  documents?: InvestmentDocument[]
  investments?: Investment[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunityContacts?: InvestmentOpportunityContact[]
  opportunityStageConditions?: InvestmentOpportunityStageCondition[]
  rejectionReasons?: any[]
  tasks?: InvestmentTask[]

  // Base fields for mapping (IRM-specific GraphQL field names that need mapping)
  investment?: Investment[] // Mapped to investments (singular in GraphQL)
  investmentActivity?: InvestmentActivity[] // Duplicate - mapped to activities
  investmentAddress?: InvestmentAddress[] // Duplicate - mapped to addresses
  investmentCommunicationChannel?: InvestmentCommunicationChannel[] // Duplicate - mapped to communicationChannels
  investmentDocument?: InvestmentDocument[] // Duplicate - mapped to documents
  investmentLead?: InvestmentLead[] // Mapped to leads
  investmentNote?: InvestmentNote[] // Duplicate - mapped to notes
  investmentOpportunityContact?: InvestmentOpportunityContact[] // Mapped to opportunityContacts
  investmentOpportunityStageCondition?: InvestmentOpportunityStageCondition[] // Mapped to opportunityStageConditions
  investmentTask?: InvestmentTask[] // Duplicate - mapped to tasks
}

/**
 * Investment Opportunity Stage Condition Type
 * Extends CommonOpportunityStageCondition with IRM-specific fields and proper type mappings
 */
export interface InvestmentOpportunityStageCondition extends CommonOpportunityStageCondition {
  // Map any types from CommonOpportunityStageCondition
  opportunity?: InvestmentOpportunity
  task?: InvestmentTask
}

/**
 * Investment Opportunity Descriptors
 * IRM uses correct field names, so we use Common descriptors directly
 */
export const INVESTMENT_OPPORTUNITY_DESCRIPTORS: Descriptor[] = [...COMMON_OPPORTUNITY_DESCRIPTORS]
