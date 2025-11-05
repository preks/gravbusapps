/**
 * Common Note Types
 * Defines the CORRECT, target Note structure
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * Common Note Interface
 * The CORRECT target structure - how ALL Notes SHOULD be structured after integration
 * Extended by BaseCustomerNote and BaseInvestmentNote
 */
export interface CommonNote extends BaseEntity {
  id: string
  source?: string
  title?: string
  text?: string
  reminderDate?: string

  // Employee Reference
  authorEmployee?: EmployeeRef
  authorEmployeeId?: string

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
