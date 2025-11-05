/**
 * Common Opportunity Types
 * Defines the CORRECT, target Opportunity structure
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * Common Opportunity Contact (Many-to-Many Join Table)
 */
export interface CommonOpportunityContact extends BaseEntity {
  id: string
  contactType?: string
  opportunityId: string
  contactId: string

  // Relations - forward declarations to avoid circular imports
  // Will be replaced by BaseCustomerOpportunityContact / BaseInvestmentOpportunityContact
  opportunity?: any // CommonOpportunity
  contact?: any // CommonContact
}

/**
 * Common Opportunity Stage Condition Interface
 * The CORRECT target structure - how ALL Opportunity Stage Conditions SHOULD be structured after integration
 * Extended by BaseCustomerOpportunityStageCondition and BaseInvestmentOpportunityStageCondition
 */
export interface CommonOpportunityStageCondition extends BaseEntity {
  id: string
  configSnapshot?: any // JSON data
  deadlineAt?: string
  completed?: boolean
  completedAt?: string

  // Catalog References
  opportunityPipelineStageCondition?: CatalogEntry
  opportunityPipelineStageConditionRef?: string

  // Employee Reference
  completedByEmployee?: EmployeeRef
  completedByEmployeeId?: string

  // Relations - forward declarations to avoid circular imports
  opportunityId?: string
  opportunity?: any // CommonOpportunity
  taskId?: string
  task?: any // CommonTask
}

/**
 * Common Opportunity Interface
 * The CORRECT target structure - how ALL Opportunities SHOULD be structured after integration
 * Extended by BaseCustomerOpportunity and BaseInvestmentOpportunity
 */
export interface CommonOpportunity extends BaseEntity {
  id: string
  code?: string
  name?: string
  notesSummary?: string
  lastInteraction?: string
  closeDate?: string
  estimatedAmount?: number
  dealType?: string
  winningChance?: number

  // Catalog References
  currency?: CatalogEntry
  currencyRef?: string

  // Employee Reference
  ownerEmployee?: EmployeeRef
  ownerEmployeeId?: string

  // Contacts (many-to-many relationship via join table)
  opportunityContacts?: CommonOpportunityContact[]

  // Addresses and Communication
  addresses?: any[] // Address[]
  communicationChannels?: any[] // CommunicationChannel[]

  // Related entities - forward declarations to avoid circular imports
  activities?: any[] // CommonActivity[]
  notes?: any[] // CommonNote[]
  documents?: any[] // CommonDocument[]
  tasks?: any[] // CommonTask[]
  stageConditions?: CommonOpportunityStageCondition[]

  // Account reference
  accountId?: string
  account?: any // CommonAccount

  // Lead reference
  leadId?: string
  lead?: any // CommonLead
}

/**
 * Filter Option Interface
 */
interface FilterOption {
  id: string
  label: string
}

/**
 * Common Opportunity Filters Interface
 * Base filter options shared across Customer and Investment Opportunities
 */
export interface CommonOpportunityFilters {
  // Standard catalog-based filters
  owners: FilterOption[]
  pipelines: FilterOption[]
  stages: FilterOption[]
  statuses: FilterOption[]
  currencies: FilterOption[]

  // Loading state
  isLoading: boolean

  // Total counts for pagination
  totalCounts?: {
    owners?: number
    pipelines?: number
    stages?: number
    statuses?: number
    currencies?: number
  }

  // Lifecycle functions
  prefetchFilters?: () => Promise<void>

  // Search functions (individual per filter group)
  searchOwners?: (query: string) => Promise<FilterOption[]>
  searchPipelines?: (query: string) => Promise<FilterOption[]>
  searchStages?: (query: string) => Promise<FilterOption[]>
  searchStatuses?: (query: string) => Promise<FilterOption[]>
  searchCurrencies?: (query: string) => Promise<FilterOption[]>

  // Load more functions (pagination)
  loadMoreOwners?: () => Promise<void>
  loadMorePipelines?: () => Promise<void>
  loadMoreStages?: () => Promise<void>
  loadMoreStatuses?: () => Promise<void>
  loadMoreCurrencies?: () => Promise<void>
}
