/**
 * Customer Task Types
 * Task-related types for Customer/CRM Relations
 */

import type { CommonTask, CommonTaskTemplate } from '@/common/data/relations/types/commonTaskTypes'
import type { TaskTiming } from '@/common/data/relations/constants/commonTaskConstants'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './customerEnums'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerLead } from './customerLeadTypes'
// Forward declarations for types that would create circular imports
import type { CustomerOpportunity, CustomerDocument } from './customerRelationTypes'

/**
 * CustomerTask
 * Maps to sales_task table in DBML
 * Extends CommonTask with Customer-specific fields
 */
export interface CustomerTask extends CommonTask {
  // Common fields with domain-specific types
  source?: SourceTable

  // Related entity references (Customer-specific)
  account?: CustomerAccount
  contact?: CustomerContact
  lead?: CustomerLead
  opportunity?: CustomerOpportunity

  // Documents
  documents?: CustomerDocument[]
  taskTemplate?: CustomerTaskTemplate

  // NOTE: Customer Relations (SalesTask) uses old field naming schema
  // We map these to the standardized names for consistency with Investment Relations

  // Timing field mapping: timingType → taskTiming
  timingType?: TaskTiming // Raw field from GraphQL (SalesTask.timing_type)

  // Catalog field mappings: type → taskType, priority → taskPriority, status → taskStatus
  type?: CatalogEntry // Raw field from GraphQL (SalesTask.type)
  typeRef?: string
  priority?: CatalogEntry // Raw field from GraphQL (SalesTask.priority)
  priorityRef?: string
  status?: CatalogEntry // Raw field from GraphQL (SalesTask.status)
  statusRef?: string

  // Task Template field mapping: salesTaskTemplate → taskTemplate
  salesTaskTemplateId?: string // Raw field from GraphQL (SalesTask.sales_task_template_id)
  salesTaskTemplate?: CustomerTaskTemplate

  // Customer-specific fields only
  comment?: string
}

/**
 * CustomerTaskTemplate
 * Maps to sales_task_template table in DBML
 * Extends CommonTaskTemplate with Customer-specific fields
 */
export interface CustomerTaskTemplate extends CommonTaskTemplate {
  // NOTE: Customer Relations (SalesTaskTemplate) uses old field naming schema
  // We map these to the standardized names for consistency with Investment Relations

  // Catalog field mappings: type → taskType, priority → taskPriority
  type?: CatalogEntry // Raw field from GraphQL (SalesTaskTemplate.type)
  typeRef?: string
  priority?: CatalogEntry // Raw field from GraphQL (SalesTaskTemplate.priority)
  priorityRef?: string

  // Domain Specific Fields
  // NOTE: SalesTaskTemplate has "investmentType" which is semantically wrong
  // TODO: Should be domain-agnostic field or not exist in SalesTaskTemplate
  investmentType?: CatalogEntry
  investmentTypeRef?: string

  // ============================================
  // COMPUTED FIELDS (for display/UI purposes)
  // ============================================
  displayName?: string
  typeLabel?: string
  priorityLabel?: string
}
