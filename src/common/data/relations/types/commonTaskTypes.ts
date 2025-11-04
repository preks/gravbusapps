/**
 * Common Task Types
 *
 * Shared interfaces for tasks across Customer and Investment relations
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { EmployeeRef } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * CommonTask interface - shared fields between BaseCustomerTask and BaseInvestmentTask
 */
export interface CommonTask extends BaseEntity {
  id: string

  // Core task fields
  code?: string
  name?: string
  description?: string

  // Date fields
  startDate?: string // ISO date string
  dueDate?: string // ISO date string
  endDate?: string // ISO date string

  // Employee references
  creatorEmployee?: EmployeeRef
  assignedEmployee?: EmployeeRef
  creatorUserId?: string
  assignedUserId?: string
}
