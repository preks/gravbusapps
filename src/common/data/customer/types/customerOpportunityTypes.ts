/**
 * Customer Opportunity Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * CustomerOpportunity
 * Main opportunity entity for CRM
 */
export interface CustomerOpportunity extends BaseEntity {
  id: string
  code?: string
  name?: string
  closeDate?: string

  // Amount and probability
  estimatedAmount?: number
  winningChance?: number

  // Catalog references
  currency?: CatalogEntry
  currencyRef?: string
  pipeline?: CatalogEntry
  salesPipeline?: CatalogEntry
  salesPipelineStage?: CatalogEntry
  opportunityStatus?: CatalogEntry

  // Direct scalar fields
  stage?: string
  status?: string

  // Employee reference
  ownerEmployee?: Employee
  ownerEmployeeId?: string

  // Entity references
  account?: any // CustomerAccount
  accountId?: string
}
