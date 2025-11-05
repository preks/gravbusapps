/**
 * Investment Activity Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { SourceTable } from './investmentEnums'

/**
 * InvestmentActivity
 * Activity entity for IRM
 */
export interface InvestmentActivity extends BaseEntity {
  id: string
  version: number
  source?: SourceTable
  title?: string
  description?: string
  occurredAt?: string
  completedAt?: string

  // Catalog references
  activityType?: CatalogEntry
  activityTypeRef?: string

  // Entity references
  investment?: any // Investment
  investmentId?: string
  ownerEmployee?: Employee
  ownerEmployeeId?: string
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
