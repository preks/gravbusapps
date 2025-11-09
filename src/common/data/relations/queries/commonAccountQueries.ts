/**
 * Common Account Queries
 * GraphQL queries for Account entities using fields mapping
 * Supports different field names per domain (IRM vs CRM)
 */

import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { AccountFields } from '../types/commonAccountTypes'
import { buildAccountFragment } from './commonAccountFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'

/**
 * Common Account Query Variables Interface
 */
export interface CommonAccountQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>

  // Filter fields
  ownerEmployeeIds?: string[]
  industryIds?: string[]
  legalFormIds?: string[]
  companySizeIds?: string[]
  revenueBandIds?: string[]
  countryIds?: string[]
  regionIds?: string[]

  // Date range filters
  createdAtFrom?: string
  createdAtTo?: string
  foundationDateFrom?: string
  foundationDateTo?: string
}

/**
 * Build Account query with fields mapping
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param fragment - GraphQL fragment string (default: buildAccountFragment with fields)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 * @returns GraphQL query string using variables
 */
export const buildAccountQuery = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields,
  fragment: string = buildAccountFragment(fields),
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
 * Build Account by ID query
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param fragment - GraphQL fragment string (default: buildAccountFragment with fields)
 * @param id - Account ID
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildAccountByIdQuery = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields,
  fragment: string = buildAccountFragment(fields),
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
 * Build Account search query (minimal fields for quick search)
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @returns GraphQL query string using variables
 */
export const buildAccountSearchQuery = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields,
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
        ${fields.code}
        ${fields.name}
      }
    }
  `
}

/**
 * Build WHERE condition for Account queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns WHERE condition object for GraphQL variables
 */
export const buildAccountWhereCondition = (
  variables: CommonAccountQueryVariables = {},
  descriptors: Descriptor[] = []
): Record<string, any> => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildWhere({
    variables,
    descriptors,
    ids: variables.ids,
    isDeleted: true
  })
}

/**
 * Build ORDER BY for Account queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildAccountOrderBy = (
  orderBy: CommonAccountQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}

// =====================================================
// ACCOUNT FRAGMENT WITH RELATIONS
// =====================================================

/**
 * Build Account fragment with common entity relations
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (domain-specific)
 * @returns GraphQL fragment string with account fields + common entity relations
 */
export interface AccountRelationBuilders {
  buildContactFragment: (fields: any) => string
  buildDocumentFragment: (fields: any) => string
  buildNoteFragment: (fields: any) => string
  buildTaskFragment: (fields: any) => string
  buildActivityFragment?: (fields: any) => string // Optional: only in IRM
  buildLeadFragment?: (fields: any) => string // Optional: only in IRM
  buildOpportunityFragment?: (fields: any) => string // Optional: present in both but with different field names
}

export interface AccountRelationFields {
  contactFields: any
  documentFields: any
  noteFields: any
  taskFields: any
  activityFields?: any // Optional: only in IRM
  leadFields?: any // Optional: only in IRM
  opportunityFields?: any // Optional: present in both but with different field names
}

export const buildAccountFragmentWithRelations = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields,
  relationBuilders: AccountRelationBuilders,
  relationFields: AccountRelationFields
): string => {
  const baseFragment = buildAccountFragment(fields)
  return `
  ${baseFragment}
  
  # Common entity relations (present in both IRM and CRM)
  # NOTE: addresses are handled separately in domain-specific queries (customerAccountQueries.new.ts, investmentAccountQueries.new.ts)
  
  ${fields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
    ${COMMUNICATION_CHANNEL_REF}
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
  
  # NOTE: activities are handled separately in domain-specific queries
  # - Investment Account: investmentAccountQueries.new.ts (IRM has activities)
  # - Customer Account: not present (CRM doesn't have activities on Account level)
  
  # AccountContacts relation (field name varies: accountContacts vs investmentAccountContact)
  ${fields.accountContacts}(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactType
    contact {
      ${relationBuilders.buildContactFragment(relationFields.contactFields)}
    }
  }
  
  # Leads relation (only in IRM, field name: leads vs investmentLead)
  ${
    relationBuilders.buildLeadFragment && relationFields.leadFields && fields.leads
      ? `${fields.leads}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
  }`
      : ''
  }
  
  # Opportunities relation (present in both, field name varies: opportunities vs investmentOpportunity vs opportunity)
  ${
    relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && fields.opportunities
      ? `${fields.opportunities}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
  }`
      : ''
  }
`
}
