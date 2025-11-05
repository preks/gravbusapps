/**
 * Customer Note Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * CustomerNote
 * Note entity for CRM (crm_note table)
 */
export interface CustomerNote extends BaseEntity {
  id: string
  title?: string
  text?: string
  reminderDate?: string

  // Employee reference
  authorEmployee?: Employee
  authorEmployeeId?: string

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
