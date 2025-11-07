/**
 * Investment Account Types
 */

import type { CommonAccount, CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'
import { COMMON_ACCOUNT_DESCRIPTORS } from '@/common/data/relations/types/commonAccountTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Investment } from './investmentTypes'
import type { InvestmentReport } from './investmentReportTypes'
import type { InvestmentAddress } from './investmentAddressTypes'
import type { InvestmentCommunicationChannel } from './investmentCommunicationChannelTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type { InvestmentActivity } from './investmentActivityTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentNote } from './investmentNoteTypes'
import type { InvestmentAccountContact } from './investmentAccountContactTypes'

/**
 * Investment Account Type
 * Extends CommonAccount with IRM-specific fields and proper type mappings
 */
export interface InvestmentAccount extends CommonAccount {
  // Map any types from CommonAccount to specific Investment types
  accountContacts?: InvestmentAccountContact[]
  activities?: InvestmentActivity[]
  addresses?: InvestmentAddress[]
  communicationChannels?: InvestmentCommunicationChannel[]
  documents?: InvestmentDocument[]
  investments?: Investment[]
  investmentReports?: InvestmentReport[]
  leads?: InvestmentLead[]
  notes?: InvestmentNote[]
  opportunities?: InvestmentOpportunity[]
  tasks?: InvestmentTask[]

  // Base fields for mapping (IRM-specific GraphQL field names that need mapping)
  investment?: Investment[] // Mapped to investments (singular in GraphQL)
  investmentAccountContact?: InvestmentAccountContact[] // Mapped to accountContacts
  investmentActivity?: InvestmentActivity[] // Duplicate - mapped to activities
  investmentAddress?: InvestmentAddress[] // Duplicate - mapped to addresses
  investmentCommunicationChannel?: InvestmentCommunicationChannel[] // Duplicate - mapped to communicationChannels
  investmentDocument?: InvestmentDocument[] // Duplicate - mapped to documents
  investmentLead?: InvestmentLead[] // Duplicate - mapped to leads
  investmentNote?: InvestmentNote[] // Duplicate - mapped to notes
  investmentOpportunity?: InvestmentOpportunity[] // Mapped to opportunities
  investmentReport?: InvestmentReport[] // Mapped to reports
  investmentTask?: InvestmentTask[] // Duplicate - mapped to tasks
}

/**
 * Investment Account Descriptors
 * IRM uses correct field names, so Common descriptors work directly
 * Add IRM-specific fields that don't exist in CRM
 */
export const INVESTMENT_ACCOUNT_DESCRIPTORS: Descriptor[] = [
  ...COMMON_ACCOUNT_DESCRIPTORS,

  // IRM-specific fields (not in Common/CRM)
  {
    key: 'investments',
    searchPaths: ['investment.name', 'investment.code'],
    sortPath: 'investment.name',
    type: 'text'
  },
  {
    key: 'investmentReports',
    searchPaths: ['investmentReport.name', 'investmentReport.code'],
    sortPath: 'investmentReport.name',
    type: 'text'
  },

  // IRM-specific filter IDs
  { key: 'investmentIds', path: 'investment.id', kind: 'inIds' },
  { key: 'reportIds', path: 'investmentReport.id', kind: 'inIds' }
]

/**
 * Investment Account Filters
 * Alias for CommonAccountFilters (IRM uses same filter structure as Common)
 */
export type InvestmentAccountFilters = CommonAccountFilters
