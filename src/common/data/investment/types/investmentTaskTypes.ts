/**
 * Investment Task Types
 * Task-related types for Investment Relations
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonTask, CommonTaskTemplate } from '@/common/data/relations/types/commonTaskTypes'
import type { SourceTable } from './investmentEnums'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { Investment } from './investmentTypes'
// Forward declarations for types that would create circular imports
import type { InvestmentDocument, InvestmentOpportunity } from './investmentRelationTypes'

/**
 * InvestmentTask
 * Maps to investment_task table in DBML
 * Extends CommonTask with Investment-specific fields
 */
export interface InvestmentTask extends CommonTask {
  // Common fields with domain-specific types
  source?: SourceTable

  // Related entity references (Investment-specific)
  account?: InvestmentAccount
  contact?: InvestmentContact
  lead?: InvestmentLead
  opportunity?: InvestmentOpportunity

  documents?: InvestmentDocument[]
  taskTemplate?: InvestmentTaskTemplate

  // Investment-specific fields
  investment?: Investment
}

/**
 * InvestmentTaskTemplate
 * Maps to investment_task_template table in DBML
 * Extends CommonTaskTemplate with Investment-specific fields
 */
export interface InvestmentTaskTemplate extends CommonTaskTemplate {
  // Domain Specific Fields
  investmentGroup?: CatalogEntry
  investmentGroupRef?: string
  investmentType?: CatalogEntry
  investmentTypeRef?: string

  // ============================================
  // COMPUTED FIELDS (for display/UI purposes)
  // ============================================
  displayName?: string
  typeLabel?: string
  priorityLabel?: string
  investmentGroupLabel?: string
  investmentTypeLabel?: string
}
