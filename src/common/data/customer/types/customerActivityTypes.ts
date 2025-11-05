/**
 * Customer Activity Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * CustomerActivity
 * Activity entity for CRM (sales_activity table)
 */
export interface CustomerActivity extends BaseEntity {
  id: string
  title?: string
  description?: string
  occurredAt?: string
  completedAt?: string

  // Performance fields
  activityScore?: number
  activityCategory?: string // PROSPECTING, NURTURING, CLOSING, FOLLOW_UP
  activityImpact?: string // HIGH, MEDIUM, LOW
  outcomeType?: string // POSITIVE, NEUTRAL, NEGATIVE
  contributesToRevenue?: boolean
  relatedOpportunityValue?: number
  nextActionRequired?: boolean
  nextActionDate?: string

  // Catalog references
  activityType?: CatalogEntry
  activityTypeRef?: string

  // Employee reference
  ownerEmployee?: Employee
  ownerEmployeeId?: string

  // Entity references
  account?: any // CustomerAccount
  accountId?: string
  contact?: any // CustomerContact
  contactId?: string
  opportunity?: any // CustomerOpportunity
  opportunityId?: string
  lead?: any // CustomerLead
  leadId?: string

  // Documents
  documents?: any[] // CustomerDocument[]
}
