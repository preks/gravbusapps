import type { CatalogEntry, EmployeeRef } from '@/common/network/graphql/commonTypes'

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

  // Catalog references (normalized names)
  currency?: CatalogEntry
  opportunityPipelineStage?: CatalogEntry
  opportunityStatus?: CatalogEntry

  // Employee reference
  ownerEmployee?: EmployeeRef

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
  className?: string
  'data-testid'?: string
}
