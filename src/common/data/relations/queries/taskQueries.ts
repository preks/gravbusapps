/**
 * Common Task Queries
 * GraphQL queries for Task entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { TaskFields } from '../types/taskTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// =====================================================
// TASK RELATION TYPES
// =====================================================

/**
 * Task relation builders interface
 * Used by buildTaskByIdQuery to build common entity relations
 */
export interface TaskRelationBuilders {
  buildDocumentFragment: (fields: any) => string
  buildAccountFragment?: (fields: any) => string // Optional: for account relation
  buildContactFragment?: (fields: any) => string // Optional: for contact relation
  buildLeadFragment?: (fields: any) => string // Optional: for lead relation
  buildOpportunityFragment?: (fields: any) => string // Optional: for opportunity relation
}

/**
 * Task relation fields interface
 * Used by buildTaskByIdQuery to pass field mappings for relations
 */
export interface TaskRelationFields {
  documentFields: any
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
}

export interface CommonTaskQueryVariables extends BaseQueryVariables {
  accountIds?: string[]
  assignedEmployeeIds?: string[]
  contactIds?: string[]
  creatorEmployeeIds?: string[]
  leadIds?: string[]
  opportunityIds?: string[]
  taskPriorityIds?: string[]
  taskStatusIds?: string[]
  taskTemplateIds?: string[]
  taskTypeIds?: string[]
  dueDateFrom?: string
  dueDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  startDateFrom?: string
  startDateTo?: string
  templateStartDateFrom?: string
  templateStartDateTo?: string
}

// =====================================================
// TASK ASSIGNEE FRAGMENT
// =====================================================

/**
 * Build Task Assignee Fragment
 * Used for querying multiple assignees per task
 */
export const buildTaskAssigneeFragment = (): string => {
  return `
    id
    taskId
    assignedEmployee {
      ${EMPLOYEE_REF}
    }
    assignedEmployeeId
    assignedUserId
    ${AUDIT_FIELDS}
  `
}

/**
 * Build Task query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - TaskFields mapping (default: TaskFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildTaskQuery = (
  entityName: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders?: Partial<TaskRelationBuilders>,
  relationFields?: Partial<TaskRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

  // Optional relations (documents, account, contact, lead, opportunity)
  const references =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    ${
      relationBuilders.buildDocumentFragment && relationFields.documentFields
        ? `${entityFields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
    }`
        : ''
    }
    
    # Optional relations (account, contact, lead, opportunity)
    ${
      relationBuilders.buildAccountFragment && relationFields.accountFields && entityFields.account
        ? `${entityFields.accountId}
      ${entityFields.account} {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildContactFragment && relationFields.contactFields && entityFields.contact
        ? `${entityFields.contactId}
      ${entityFields.contact} {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildLeadFragment && relationFields.leadFields && entityFields.lead
        ? `${entityFields.leadId}
      ${entityFields.lead} {
        ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && entityFields.opportunity
        ? `${entityFields.opportunityId}
      ${entityFields.opportunity} {
        ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
      }`
        : ''
    }
  `
      : ''

  return `
    query Get${entityName}s(
      $limit: Int
      $offset: Int
      $where: ${boolExpType}
      $orderBy: ${orderByType}
    ) {
      ${entityName}(
        limit: $limit
        offset: $offset
        orderBy: $orderBy
        where: $where
      ) {
        ${AUDIT_FIELDS}
        
        # Multiple assignees (many-to-many via TaskAssignee)
        ${entityFields.taskAssignees}(where: { isDeleted: { _eq: false } }) {
          ${buildTaskAssigneeFragment()}
        }
        ${entityFields.taskAssigneesAggregate}(where: { isDeleted: { _eq: false } }) {
          aggregate {
            count
          }
        }
        
        ${entityFields.code}
        ${entityFields.creatorEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.creatorEmployeeId}
        ${entityFields.creatorUserId}
        ${entityFields.description}
        ${entityFields.dueDate}
        ${entityFields.endDate}
        ${entityFields.id}
        ${entityFields.name}
        ${entityFields.source}
        ${entityFields.startDate}
        ${entityFields.taskPriority} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.taskPriorityRef}
        ${entityFields.taskStatus} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.taskStatusRef}
        ${entityFields.taskTiming}
        ${entityFields.taskType} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.taskTypeRef}
        ${entityFields.templateStartDate}
        ${additionalFields || ''}
        ${references}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${additionalQueries || ''}
    }
  `
}

/**
 * Build Task by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Task ID
 * @param entityFields - TaskFields mapping (default: TaskFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 */
export const buildTaskByIdQuery = (
  entityName: string,
  id: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders?: TaskRelationBuilders,
  relationFields?: TaskRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        # Multiple assignees (many-to-many via TaskAssignee)
        ${entityFields.taskAssignees}(where: { isDeleted: { _eq: false } }) {
          ${buildTaskAssigneeFragment()}
        }
        ${entityFields.taskAssigneesAggregate}(where: { isDeleted: { _eq: false } }) {
          aggregate {
            count
          }
        }
        ${entityFields.code}
        ${entityFields.creatorEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.creatorEmployeeId}
        ${entityFields.creatorUserId}
        ${entityFields.description}
        ${entityFields.dueDate}
        ${entityFields.endDate}
        ${entityFields.id}
        ${entityFields.name}
        ${entityFields.source}
        ${entityFields.startDate}
        ${entityFields.taskPriority} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.taskPriorityRef}
        ${entityFields.taskStatus} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.taskStatusRef}
        ${entityFields.taskTiming}
        ${entityFields.taskType} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.taskTypeRef}
        ${entityFields.templateStartDate}
  `

  // Common entity relations
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    ${entityFields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
    }
    
    # Optional relations (account, contact, lead, opportunity)
    ${
      relationBuilders.buildAccountFragment && relationFields.accountFields && entityFields.account
        ? `${entityFields.accountId}
      ${entityFields.account} {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildContactFragment && relationFields.contactFields && entityFields.contact
        ? `${entityFields.contactId}
      ${entityFields.contact} {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildLeadFragment && relationFields.leadFields && entityFields.lead
        ? `${entityFields.leadId}
      ${entityFields.lead} {
        ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && entityFields.opportunity
        ? `${entityFields.opportunityId}
      ${entityFields.opportunity} {
        ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
      }`
        : ''
    }
  `
      : ''

  return `
    query Get${entityName}ById {
      ${entityName}ByPk(id: "${id}") {
        ${baseFields}
        ${commonRelations}
        ${additionalFields || ''}
      }
    }
  `
}

/**
 * Build Task search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - TaskFields mapping (default: TaskFields)
 */
export const buildTaskSearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields
): string => {
  const boolExpType = `${entityName}BoolExp`

  return `
    query Search${entityName}s(
      $limit: Int
      $where: ${boolExpType}
    ) {
      ${entityName}(
        limit: $limit
        where: $where
      ) {
        ${entityFields.id}
        ${entityFields.name}
        ${entityFields.description}
      }
    }
  `
}

/**
 * Build WHERE condition for Task queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildTaskWhereCondition = (
  variables: CommonTaskQueryVariables = {},
  descriptors: Descriptor[] = [],
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }

  // Handle multiple assignees filter (NEW)
  // When assignedEmployeeIds is provided, filter by taskAssignees relationship
  const modifiedVariables = { ...variables }
  const modifiedCustomConditions = [...customConditions]

  if (
    variables.assignedEmployeeIds &&
    Array.isArray(variables.assignedEmployeeIds) &&
    variables.assignedEmployeeIds.length > 0
  ) {
    // Add taskAssignees filter condition
    modifiedCustomConditions.push({
      taskAssignees: {
        assignedEmployeeId: { _in: variables.assignedEmployeeIds },
        isDeleted: { _eq: false }
      }
    })

    // Remove assignedEmployeeIds from variables to prevent it from being processed by base builder
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { assignedEmployeeIds, ...restVariables } = modifiedVariables
    Object.assign(modifiedVariables, restVariables)
  }

  return buildWhere({
    variables: modifiedVariables,
    descriptors,
    ids: modifiedVariables.ids,
    customConditions: modifiedCustomConditions,
    isDeleted: true
  })
}

/**
 * Build ORDER BY for Task queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildTaskOrderBy = (
  orderBy: CommonTaskQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}

// =====================================================
// TASK BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Task query filtered by Lead ID
 * Uses buildTaskQuery and ensures all relations (including documents) are included
 * @param entityName - GraphQL entity name (REQUIRED, e.g. 'InvestmentTask', 'SalesTask')
 * @param entityFields - TaskFields mapping (default: TaskFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (REQUIRED)
 * @param relationFields - Object containing field mappings for relations (REQUIRED)
 * @param additionalFields - Additional domain-specific fields (optional, e.g. investment relation for IRM)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables ($where, $orderBy)
 */
export const buildTaskByLeadIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders: Partial<TaskRelationBuilders>,
  relationFields: Partial<TaskRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildTaskQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}

/**
 * Build Task query filtered by Account ID
 * Uses buildTaskQuery and ensures all relations (including documents) are included
 */
export const buildTaskByAccountIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders: Partial<TaskRelationBuilders>,
  relationFields: Partial<TaskRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildTaskQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}

/**
 * Build Task query filtered by Contact ID
 * Uses buildTaskQuery and ensures all relations (including documents) are included
 */
export const buildTaskByContactIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders: Partial<TaskRelationBuilders>,
  relationFields: Partial<TaskRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildTaskQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}

/**
 * Build Task query filtered by Opportunity ID
 * Uses buildTaskQuery and ensures all relations (including documents) are included
 */
export const buildTaskByOpportunityIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders: Partial<TaskRelationBuilders>,
  relationFields: Partial<TaskRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildTaskQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}
