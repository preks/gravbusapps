/**
 * Common Activity Types
 * Defines the CORRECT, target Activity structure
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * Common Activity Interface
 * The CORRECT target structure - how ALL Activities SHOULD be structured after integration
 * Extended by BaseCustomerActivity and BaseInvestmentActivity
 *
 * Note: CrmActivity does not exist in Hasura - only InvestmentActivity exists!
 */
export interface CommonActivity extends BaseEntity {
  id: string
  source?: string
  title?: string
  description?: string
  occurredAt?: string
  completedAt?: string

  // Catalog References
  activityType?: CatalogEntry
  activityTypeRef?: string

  // Employee Reference
  ownerEmployee?: EmployeeRef
  ownerEmployeeId?: string

  // Related entities - forward declarations to avoid circular imports
  documents?: any[] // CommonDocument[]

  // Entity references
  accountId?: string
  account?: any // CommonAccount
  contactId?: string
  contact?: any // CommonContact
  leadId?: string
  lead?: any // CommonLead
  opportunityId?: string
  opportunity?: any // CommonOpportunity
}
