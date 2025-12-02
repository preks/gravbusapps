import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'
/**
 * Generic Account reference that supports both Investment and Customer accounts
 */
export interface GenericAccountRef {
  id: string
  name?: string
  code?: string
  pictureThumbnail?: string // InvestmentAccount uses this
  pictureThumbnailUrl?: string // CustomerAccount uses this
}

/**
 * Generic Opportunity interface that supports both Investment and Customer opportunities
 * This interface extracts common fields from both BaseInvestmentOpportunity and BaseCustomerOpportunity
 */
export interface GenericOpportunity {
  id: string
  name?: string
  code?: string

  // Amount and close date
  estimatedAmount?: number
  closeDate?: string

  // Win probability
  winningChance?: number

  // Catalog references (normalized names)
  currency?: CatalogEntry
  opportunityPipelineStage?: CatalogEntry
  opportunityStatus?: CatalogEntry

  // Employee reference
  ownerEmployee?: EmployeeRef

  // Account reference
  account?: GenericAccountRef

  // Timestamps
  createdAt?: string
  updatedAt?: string
}

/**
 * Props for OpportunitySection component
 */
export interface OpportunitySectionProps<T extends GenericOpportunity = GenericOpportunity> {
  opportunities: T[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  recordUrlBuilder: (opportunityId: string) => string
  accountUrlBuilder?: (accountId: string) => string // Optional, for account navigation
  className?: string
  'data-testid'?: string
  // Context type for determining labels (CRM: "Winning Chance", IRM: "Deal Probability")
  contextType?: 'customer' | 'investment'
}
