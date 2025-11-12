/**
 * Common Activity Queries
 * GraphQL queries for Activity entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { ActivityFields } from '../types/activityTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// =====================================================
// ACTIVITY RELATION TYPES
// =====================================================

/**
 * Activity relation builders interface
 * Used by buildActivityByIdQuery to build common entity relations
 */
export interface ActivityRelationBuilders {
  buildDocumentFragment: (fields: any) => string
  buildAccountFragment?: (fields: any) => string // Optional: for account relation
  buildContactFragment?: (fields: any) => string // Optional: for contact relation
  buildLeadFragment?: (fields: any) => string // Optional: for lead relation
  buildOpportunityFragment?: (fields: any) => string // Optional: for opportunity relation
}

/**
 * Activity relation fields interface
 * Used by buildActivityByIdQuery to pass field mappings for relations
 */
export interface ActivityRelationFields {
  documentFields: any
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
}

export interface CommonActivityQueryVariables extends BaseQueryVariables {
  accountIds?: string[]
  activityTypeIds?: string[]
  contactIds?: string[]
  leadIds?: string[]
  opportunityIds?: string[]
  ownerEmployeeIds?: string[]
  completedAtFrom?: string
  completedAtTo?: string
  occurredAtFrom?: string
  occurredAtTo?: string
}

/**
 * Build Activity query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - ActivityFields mapping (default: ActivityFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildActivityQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders?: Partial<ActivityRelationBuilders>,
  relationFields?: Partial<ActivityRelationFields>,
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
    ${entityFields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders?.buildDocumentFragment?.(relationFields.documentFields)}
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
        ${entityFields.activityType} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.activityTypeRef}
        ${entityFields.completedAt}
        ${entityFields.description}
        ${entityFields.id}
        ${entityFields.occurredAt}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.source}
        ${entityFields.title}
        ${additionalFields || ''}
        ${references || ''}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${additionalQueries || ''}
    }
  `
}

/**
 * Build Activity by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Activity ID
 * @param entityFields - ActivityFields mapping (default: ActivityFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 */
export const buildActivityByIdQuery = (
  entityName: string,
  id: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders?: ActivityRelationBuilders,
  relationFields?: ActivityRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${entityFields.activityType} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.activityTypeRef}
        ${entityFields.completedAt}
        ${entityFields.description}
        ${entityFields.id}
        ${entityFields.occurredAt}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.source}
        ${entityFields.title}
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
 * Build Activity search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - ActivityFields mapping (default: ActivityFields)
 */
export const buildActivitySearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields
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
        ${entityFields.title}
        ${entityFields.description}
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

// =====================================================
// ACTIVITY BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Activity query filtered by Lead ID
 * Uses buildActivityQuery and ensures all relations (including documents) are included
 */
export const buildActivityByLeadIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders: Partial<ActivityRelationBuilders>,
  relationFields: Partial<ActivityRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildActivityQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}

/**
 * Build Activity query filtered by Account ID
 * Uses buildActivityQuery and ensures all relations (including documents) are included
 */
export const buildActivityByAccountIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders: Partial<ActivityRelationBuilders>,
  relationFields: Partial<ActivityRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildActivityQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}

/**
 * Build Activity query filtered by Contact ID
 * Uses buildActivityQuery and ensures all relations (including documents) are included
 */
export const buildActivityByContactIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders: Partial<ActivityRelationBuilders>,
  relationFields: Partial<ActivityRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildActivityQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}

/**
 * Build Activity query filtered by Opportunity ID
 * Uses buildActivityQuery and ensures all relations (including documents) are included
 */
export const buildActivityByOpportunityIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ActivityFields, string> = ActivityFields,
  relationBuilders: Partial<ActivityRelationBuilders>,
  relationFields: Partial<ActivityRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildActivityQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}
