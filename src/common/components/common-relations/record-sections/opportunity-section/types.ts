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

import type { ColumnDef } from '@tanstack/react-table'

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
  // Additional columns to extend the base columns (e.g., CRM-specific winningChance)
  additionalColumns?: ColumnDef<T>[]
  // Additional column IDs to include in visible columns by default
  extendVisibleColumns?: string[]
}
