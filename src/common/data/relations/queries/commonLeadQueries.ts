/**
 * Common Lead Queries
 * GraphQL queries for Lead entities using fields mapping
 */

import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { LeadFields } from '../types/commonLeadTypes'
import { buildLeadFragment } from './commonLeadFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Build Lead fragment with common entity relations
 */
export interface LeadRelationBuilders {
  buildActivityFragment: (fields: any) => string
  buildDocumentFragment: (fields: any) => string
  buildNoteFragment: (fields: any) => string
  buildTaskFragment: (fields: any) => string
  buildAccountFragment?: (fields: any) => string // Optional: for convertedAccount
  buildContactFragment?: (fields: any) => string // Optional: for convertedContact
  buildOpportunityFragment?: (fields: any) => string // Optional: for convertedOpportunity
}

export interface LeadRelationFields {
  activityFields: any
  documentFields: any
  noteFields: any
  taskFields: any
  accountFields?: any // Optional: for convertedAccount
  contactFields?: any // Optional: for convertedContact
  opportunityFields?: any // Optional: for convertedOpportunity
}

export const buildLeadFragmentWithRelations = (
  fields: Record<keyof typeof LeadFields, string> = LeadFields,
  relationBuilders: LeadRelationBuilders,
  relationFields: LeadRelationFields
): string => {
  const baseFragment = buildLeadFragment(fields)
  return `
  ${baseFragment}
  
  # Common entity relations (present in both IRM and CRM)
  ${fields.activities}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
  }
  
  ${fields.documents}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
  }
  
  ${fields.notes}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildNoteFragment(relationFields.noteFields)}
  }
  
  ${fields.tasks}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
  }
  
  # Converted relations (for leads that were converted)
  ${
    relationBuilders.buildAccountFragment && relationFields.accountFields && fields.convertedAccount
      ? `${fields.convertedAccount} {
    ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
  }`
      : ''
  }
  
  ${
    relationBuilders.buildContactFragment && relationFields.contactFields && fields.convertedContact
      ? `${fields.convertedContact} {
    ${relationBuilders.buildContactFragment(relationFields.contactFields)}
  }`
      : ''
  }
  
  ${
    relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && fields.convertedOpportunity
      ? `${fields.convertedOpportunity} {
    ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
  }`
      : ''
  }
`
}

export interface CommonLeadQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
  academicTitleIds?: string[]
  accountAnnualRevenueBandIds?: string[]
  companySizeIds?: string[]
  convertedAccountIds?: string[]
  convertedContactIds?: string[]
  convertedOpportunityIds?: string[]
  countryIds?: string[]
  industryClassIds?: string[]
  leadRatingIds?: string[]
  leadSourceIds?: string[]
  leadStatusIds?: string[]
  ownerEmployeeIds?: string[]
  regionIds?: string[]
  salutationIds?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  conversionDateFrom?: string
  conversionDateTo?: string
}

/**
 * Build Lead query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 */
export const buildLeadQuery = (
  fields: typeof LeadFields = LeadFields,
  fragment: string = buildLeadFragment(fields),
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
 * Build Lead by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildLeadByIdQuery = (
  fields: typeof LeadFields = LeadFields,
  fragment: string = buildLeadFragment(fields),
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
 * Build Lead search query
 * @param entityName - GraphQL entity name (REQUIRED)
 */
export const buildLeadSearchQuery = (fields: typeof LeadFields = LeadFields, entityName: string): string => {
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
        ${fields.code}
        ${fields.firstName}
        ${fields.lastName}
        ${fields.companyName}
      }
    }
  `
}

/**
 * Build WHERE condition for Lead queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildLeadWhereCondition = (
  variables: CommonLeadQueryVariables = {},
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
 * Build ORDER BY for Lead queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildLeadOrderBy = (
  orderBy: CommonLeadQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}
