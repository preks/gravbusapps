/**
 * Common Activity Queries
 * GraphQL queries for Activity entities using fields mapping
 */

import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { ActivityFields } from '../types/commonActivityTypes'
import { buildActivityFragment } from './commonActivityFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Build Activity fragment with common entity relations
 */
export interface ActivityRelationBuilders {
  buildDocumentFragment: (fields: any) => string
  buildAccountFragment?: (fields: any) => string // Optional: for account relation
  buildContactFragment?: (fields: any) => string // Optional: for contact relation
  buildLeadFragment?: (fields: any) => string // Optional: for lead relation
  buildOpportunityFragment?: (fields: any) => string // Optional: for opportunity relation
}

export interface ActivityRelationFields {
  documentFields: any
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
}

export const buildActivityFragmentWithRelations = (
  fields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders: ActivityRelationBuilders,
  relationFields: ActivityRelationFields
): string => {
  const baseFragment = buildActivityFragment(fields)
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

export interface CommonActivityQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
  accountIds?: string[]
  activityTypeIds?: string[]
  contactIds?: string[]
  leadIds?: string[]
  opportunityIds?: string[]
  ownerEmployeeIds?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  completedAtFrom?: string
  completedAtTo?: string
  occurredAtFrom?: string
  occurredAtTo?: string
}

/**
 * Build Activity query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 */
export const buildActivityQuery = (
  fields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  fragment: string = buildActivityFragment(fields),
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
 * Build Activity by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildActivityByIdQuery = (
  fields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  fragment: string = buildActivityFragment(fields),
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
 * Build Activity search query
 * @param entityName - GraphQL entity name (REQUIRED)
 */
export const buildActivitySearchQuery = (
  fields: Record<keyof typeof ActivityFields, string> = ActivityFields,
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
        ${fields.title}
        ${fields.description}
      }
    }
  `
}

/**
 * Build WHERE condition for Activity queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildActivityWhereCondition = (
  variables: CommonActivityQueryVariables = {},
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
 * Build ORDER BY for Activity queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildActivityOrderBy = (
  orderBy: CommonActivityQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}
