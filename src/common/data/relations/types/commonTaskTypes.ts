/**
 * Common Task Types
 *
 * Shared interfaces for tasks, task templates, and task comments
 * across Customer and Investment relations
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { TaskTiming } from '../constants/commonTaskConstants'

/**
 * Task Reference - Reference to a related entity
 * Computed field created by domain-specific mappers
 */
export interface TaskReference {
  type: string // Entity type (e.g., 'opportunity', 'account', 'lead', 'contact', 'investment')
  id: string
  name: string
  code?: string
  pictureThumbnail?: string
}

/**
 * CommonTask interface - shared fields between BaseCustomerTask and BaseInvestmentTask
 */
export interface CommonTask extends BaseEntity {
  id: string

  // Common fields
  code?: string
  name?: string
  source?: string // Specified by Entity
  description?: string
  templateStartDate?: string // ISO date string
  startDate?: string // ISO date string
  dueDate?: string // ISO date string
  endDate?: string // ISO date string
  taskTiming?: TaskTiming

  // Employee references
  creatorEmployee?: Employee
  creatorEmployeeId?: string
  assignedEmployee?: Employee
  assignedEmployeeId?: string
  creatorUserId?: string
  assignedUserId?: string

  // Catalog References
  taskType?: CatalogEntry
  taskTypeRef?: string
  taskPriority?: CatalogEntry
  taskPriorityRef?: string
  taskStatus?: CatalogEntry
  taskStatusRef?: string

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

  // Task Template reference
  taskTemplateId?: string
  taskTemplate?: any // CommonTaskTemplate - will be replaced by domain-specific type

  // Task Comments (Investment Relations only)
  comments?: any[] // CommonTaskComment[] - will be replaced by domain-specific type

  // ============================================
  // COMPUTED FIELDS (for display/UI purposes)
  // ============================================
  // Reference to related entity (computed by mappers)
  reference?: TaskReference
}

/**
 * Common Task Template Interface
 * The CORRECT target structure - how ALL Task Templates SHOULD be structured after integration
 * Extended by BaseCustomerTaskTemplate and BaseInvestmentTaskTemplate
 */
export interface CommonTaskTemplate extends BaseEntity {
  id: string
  code?: string
  name?: string
  description?: string
  displayOrder?: number

  // Active period
  enabled?: boolean

  // Recurrence settings
  intervalDays?: number
  durationDays?: number
  daysOfWeek?: any // JSON array
  daysOfMonth?: any // JSON array
  monthsOfYear?: any // JSON array

  // Assignment settings
  assigneeType?: string
  holidayPolicy?: string

  // Next execution
  nextStartDate?: string

  // Catalog References
  taskType?: CatalogEntry
  taskTypeRef?: string
  taskPriority?: CatalogEntry
  taskPriorityRef?: string
}

/**
 * Common Task Comment Interface
 * Only used in Investment Relations
 *
 * Note: Task Comments only exist in Investment Relations (investment_task_comment)
 * There is no equivalent in CRM/Sales Tasks
 */
export interface CommonTaskComment extends BaseEntity {
  id: string
  comment?: string

  // Task reference - forward declaration to avoid circular imports
  taskId?: string
  task?: any // CommonTask - will be replaced by domain-specific type

  // Employee reference
  authorEmployee?: Employee
  authorEmployeeId?: string
}
