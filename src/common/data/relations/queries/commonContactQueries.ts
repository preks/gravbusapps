/**
 * Common Contact Queries
 * GraphQL queries for Contact entities using fields mapping
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { ContactFields } from '../types/commonContactTypes'
import { buildContactFragment } from './commonContactFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Build Contact fragment with common entity relations
 */
export interface ContactRelationBuilders {
  buildActivityFragment: (fields: any) => string
  buildAccountFragment: (fields: any) => string
  buildDocumentFragment: (fields: any) => string
  buildLeadFragment: (fields: any) => string
  buildNoteFragment: (fields: any) => string
  buildOpportunityFragment: (fields: any) => string
  buildTaskFragment: (fields: any) => string
}

export interface ContactRelationFields {
  activityFields: any
  accountFields: any
  documentFields: any
  leadFields: any
  noteFields: any
  opportunityFields: any
  taskFields: any
}

export const buildContactFragmentWithRelations = (
  fields: Record<keyof typeof ContactFields, string> = ContactFields,
  relationBuilders: ContactRelationBuilders,
  relationFields: ContactRelationFields
): string => {
  const baseFragment = buildContactFragment(fields)
  return `
  ${baseFragment}
  
  # Common entity relations (present in both IRM and CRM)
  # NOTE: addresses are handled separately in domain-specific queries (customerContactQueries.new.ts, investmentContactQueries.new.ts)
  
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
  
  ${fields.activities}(where: { isDeleted: { _eq: false } }) {
    ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
  }
  
  # AccountContacts relation (field name varies: accountContacts vs investmentAccountContact)
  ${fields.accountContacts}(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactType
    account {
      ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
    }
  }
  
  # NOTE: leads relation is handled separately in domain-specific queries
  # - Customer Contact: singular "lead" (object, no where)
  # - Investment Contact: plural "investmentLead" (array, with where)
  
  # OpportunityContacts relation (field name varies: opportunityContacts vs investmentOpportunityContact)
  ${fields.opportunityContacts}(where: { isDeleted: { _eq: false } }) {
    id
    ${AUDIT_FIELDS}
    contactType
    opportunity {
      ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
    }
  }
`
}

export interface CommonContactQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
  academicTitleIds?: string[]
  languageIds?: string[]
  ownerEmployeeIds?: string[]
  salutationIds?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  birthDateFrom?: string
  birthDateTo?: string
}

/**
 * Build Contact query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 */
export const buildContactQuery = (
  fields: Record<keyof typeof ContactFields, string> = ContactFields,
  fragment: string = buildContactFragment(fields),
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
 * Build Contact by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildContactByIdQuery = (
  fields: Record<keyof typeof ContactFields, string> = ContactFields,
  fragment: string = buildContactFragment(fields),
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
 * Build Contact search query
 * @param entityName - GraphQL entity name (REQUIRED)
 */
export const buildContactSearchQuery = (
  fields: Record<keyof typeof ContactFields, string> = ContactFields,
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
        ${fields.firstName}
        ${fields.lastName}
      }
    }
  `
}

/**
 * Build WHERE condition for Contact queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildContactWhereCondition = (
  variables: CommonContactQueryVariables = {},
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
 * Build ORDER BY for Contact queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildContactOrderBy = (
  orderBy: CommonContactQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}
