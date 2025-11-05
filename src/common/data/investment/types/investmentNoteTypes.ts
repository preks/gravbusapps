/**
 * Investment Note Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { SourceTable } from './investmentEnums'

/**
 * InvestmentNote
 * Note entity for IRM
 */
export interface InvestmentNote extends BaseEntity {
  id: string
  source?: SourceTable
  title?: string
  text?: string
  reminderDate?: string

  // Entity references
  investment?: any // Investment
  investmentId?: string
  authorEmployee?: Employee
  authorEmployeeId?: string
  account?: any // InvestmentAccount
  accountId?: string
  contact?: any // InvestmentContact
  contactId?: string
  opportunity?: any // InvestmentOpportunity
  opportunityId?: string
  lead?: any // InvestmentLead
  leadId?: string

  // Documents
  documents?: any[] // InvestmentDocument[]
}
