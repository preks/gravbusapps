/**
 * Common Task Queries
 * GraphQL queries for Task entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { TaskFields } from '../types/taskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
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

/**
 * Build Task query with fields mapping
 * @param fields - TaskFields mapping (default: TaskFields)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - Additional domain-specific fields (optional)
 * @param queryFields - Additional query fields (optional)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @returns GraphQL query string using variables
 */
export const buildTaskQuery = (
  fields: Record<keyof typeof TaskFields, string> = TaskFields,
  entityName: string,
  entityFields?: string,
  queryFields?: string,
  relationBuilders?: Partial<TaskRelationBuilders>,
  relationFields?: Partial<TaskRelationFields>
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

  // Optional relations (account, contact, lead, opportunity)
  const references =
    relationBuilders && relationFields
      ? `
    # Optional relations (account, contact, lead, opportunity)
    ${
      relationBuilders.buildAccountFragment && relationFields.accountFields && fields.account
        ? `${fields.accountId}
      ${fields.account} {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildContactFragment && relationFields.contactFields && fields.contact
        ? `${fields.contactId}
      ${fields.contact} {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildLeadFragment && relationFields.leadFields && fields.lead
        ? `${fields.leadId}
      ${fields.lead} {
        ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && fields.opportunity
        ? `${fields.opportunityId}
      ${fields.opportunity} {
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
        ${fields.assignedEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.assignedEmployeeId}
        ${fields.assignedUserId}
        ${fields.code}
        ${fields.creatorEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.creatorEmployeeId}
        ${fields.creatorUserId}
        ${fields.description}
        ${fields.dueDate}
        ${fields.endDate}
        ${fields.id}
        ${fields.name}
        ${fields.source}
        ${fields.startDate}
        ${fields.taskPriority} {
          ${CATALOG_ENTRY}
        }
        ${fields.taskPriorityRef}
        ${fields.taskStatus} {
          ${CATALOG_ENTRY}
        }
        ${fields.taskStatusRef}
        ${fields.taskTiming}
        ${fields.taskType} {
          ${CATALOG_ENTRY}
        }
        ${fields.taskTypeRef}
        ${fields.templateStartDate}
        ${references}
        ${entityFields || ''}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${queryFields || ''}
    }
  `
}

/**
 * Build Task by ID query
 * @param fields - TaskFields mapping (default: TaskFields)
 * @param id - Task ID
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param entityFields - Additional domain-specific fields (optional)
 */
export const buildTaskByIdQuery = (
  fields: Record<keyof typeof TaskFields, string> = TaskFields,
  id: string,
  entityName: string,
  relationBuilders?: TaskRelationBuilders,
  relationFields?: TaskRelationFields,
  entityFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${fields.assignedEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.assignedEmployeeId}
        ${fields.assignedUserId}
        ${fields.code}
        ${fields.creatorEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.creatorEmployeeId}
        ${fields.creatorUserId}
        ${fields.description}
        ${fields.dueDate}
        ${fields.endDate}
        ${fields.id}
        ${fields.name}
        ${fields.source}
        ${fields.startDate}
        ${fields.taskPriority} {
          ${CATALOG_ENTRY}
        }
        ${fields.taskPriorityRef}
        ${fields.taskStatus} {
          ${CATALOG_ENTRY}
        }
        ${fields.taskStatusRef}
        ${fields.taskTiming}
        ${fields.taskType} {
          ${CATALOG_ENTRY}
        }
        ${fields.taskTypeRef}
        ${fields.templateStartDate}
  `

  // Common entity relations
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    ${fields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
    }
    
    # Optional relations (account, contact, lead, opportunity)
    ${
      relationBuilders.buildAccountFragment && relationFields.accountFields && fields.account
        ? `${fields.accountId}
      ${fields.account} {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildContactFragment && relationFields.contactFields && fields.contact
        ? `${fields.contactId}
      ${fields.contact} {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildLeadFragment && relationFields.leadFields && fields.lead
        ? `${fields.leadId}
      ${fields.lead} {
        ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && fields.opportunity
        ? `${fields.opportunityId}
      ${fields.opportunity} {
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
        ${entityFields || ''}
      }
    }
  `
}

/**
 * Build Task search query
 * @param entityName - GraphQL entity name (REQUIRED)
 */
export const buildTaskSearchQuery = (
  fields: Record<keyof typeof TaskFields, string> = TaskFields,
  entityName: string
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
        ${fields.id}
        ${fields.name}
        ${fields.description}
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
  return buildWhere({
    variables,
    descriptors,
    ids: variables.ids,
    customConditions,
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
