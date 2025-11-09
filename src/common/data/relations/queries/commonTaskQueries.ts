/**
 * Common Task Queries
 * GraphQL queries for Task entities using fields mapping
 */

import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { TaskFields } from '../types/commonTaskTypes'
import { buildTaskFragment } from './commonTaskFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Build Task fragment with common entity relations
 */
export interface TaskRelationBuilders {
  buildDocumentFragment: (fields: any) => string
  buildAccountFragment?: (fields: any) => string // Optional: for account relation
  buildContactFragment?: (fields: any) => string // Optional: for contact relation
  buildLeadFragment?: (fields: any) => string // Optional: for lead relation
  buildOpportunityFragment?: (fields: any) => string // Optional: for opportunity relation
}

export interface TaskRelationFields {
  documentFields: any
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
}

export const buildTaskFragmentWithRelations = (
  fields: Record<keyof typeof TaskFields, string> = TaskFields,
  relationBuilders: TaskRelationBuilders,
  relationFields: TaskRelationFields
): string => {
  const baseFragment = buildTaskFragment(fields)
  return `
  ${baseFragment}
  
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
}

export interface CommonTaskQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
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
  createdAtFrom?: string
  createdAtTo?: string
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
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 */
export const buildTaskQuery = (
  fields: Record<keyof typeof TaskFields, string> = TaskFields,
  fragment: string = buildTaskFragment(fields),
  entityName: string,
  aggregateName?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`
  const finalAggregateName = aggregateName || `${entityName}Aggregate`

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
        ${fragment}
      }
      ${finalAggregateName}(where: $where) {
        aggregate { count }
      }
    }
  `
}

/**
 * Build Task by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildTaskByIdQuery = (
  fields: Record<keyof typeof TaskFields, string> = TaskFields,
  fragment: string = buildTaskFragment(fields),
  id: string,
  entityName: string,
  byPkName?: string
): string => {
  const finalByPkName = byPkName || `${entityName}ByPk`

  return `
    query Get${entityName}ById {
      ${finalByPkName}(id: "${id}") {
        ${fragment}
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
