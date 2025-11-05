/**
 * Investment Account Types
 */

import type { CommonAccount, CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'
import type { Investment } from './investmentTypes'
import type { InvestmentReport } from './investmentReportTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentAccountContact } from './investmentAccountContactTypes'
/**
 * Investment Account Type
 * Extends CommonAccount with IRM-specific fields
 */
export interface InvestmentAccount extends CommonAccount {
  // Relation Mappings
  accountContacts?: InvestmentAccountContact[] // InvestmentAccountContact[] - join table
  opportunities?: InvestmentOpportunity[]
  leads?: InvestmentLead[]
  tasks?: InvestmentTask[]
  activities?: InvestmentActivity[]
  documents?: InvestmentDocument[]
  notes?: InvestmentNote[]

  // Mapped arrays for consistent usage
  investments?: Investment[] // Mapped from investment
  investmentReports?: InvestmentReport[] // Mapped from investmentReport

  // IRM uses investment prefix for most relations
  investmentAddress?: Address[] // InvestmentAddress[]
  investmentCommunicationChannel?: CommunicationChannel[] // InvestmentCommunicationChannel[]
  investmentAccountContact?: InvestmentAccountContact[] // InvestmentAccountContact[] - join table
  investmentOpportunity?: InvestmentOpportunity[] // InvestmentOpportunity[]
  investmentLead?: InvestmentLead[] // InvestmentLead[]
  investmentTask?: InvestmentTask[] // InvestmentTask[]
  investmentActivity?: InvestmentActivity[] // InvestmentActivity[]
  investmentDocument?: InvestmentDocument[] // InvestmentDocument[]
  investmentNote?: InvestmentNote[] // InvestmentNote[]

  // Investment-specific relations (GraphQL field names)
  investment?: Investment[] // Investment[] - singular in GraphQL query
  investmentReport?: InvestmentReport[] // InvestmentReport[] - singular in GraphQL query
}

/**
 * Investment Account Filters Interface
 * Extends common filters with Investment-specific filters
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InvestmentAccountFilters extends CommonAccountFilters {
  // Investment-specific filters can be added here if needed
}
