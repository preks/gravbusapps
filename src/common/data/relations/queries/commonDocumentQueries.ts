/**
 * Common Document Queries
 * GraphQL queries for Document entities using fields mapping
 */

import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { DocumentFields } from '../types/commonDocumentTypes'
import { buildDocumentFragment } from './commonDocumentFragments.new'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

/**
 * Build Document fragment with common entity relations
 * Documents have no array relations, only references to other entities
 */
export interface DocumentRelationBuilders {
  buildAccountFragment?: (fields: any) => string // Optional: for account relation
  buildContactFragment?: (fields: any) => string // Optional: for contact relation
  buildLeadFragment?: (fields: any) => string // Optional: for lead relation
  buildOpportunityFragment?: (fields: any) => string // Optional: for opportunity relation
  buildTaskFragment?: (fields: any) => string // Optional: for task relation
  buildActivityFragment?: (fields: any) => string // Optional: for activity relation
  buildNoteFragment?: (fields: any) => string // Optional: for note relation
}

export interface DocumentRelationFields {
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
  taskFields?: any // Optional: for task relation
  activityFields?: any // Optional: for activity relation
  noteFields?: any // Optional: for note relation
}

export const buildDocumentFragmentWithRelations = (
  fields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders: DocumentRelationBuilders,
  relationFields: DocumentRelationFields
): string => {
  const baseFragment = buildDocumentFragment(fields)
  return `
  ${baseFragment}
  
  # Optional relations (account, contact, lead, opportunity, task, activity, note)
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
  
  ${
    relationBuilders.buildTaskFragment && relationFields.taskFields && fields.task
      ? `${fields.taskId}
  ${fields.task} {
    ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
  }`
      : ''
  }
  
  ${
    relationBuilders.buildActivityFragment && relationFields.activityFields && fields.activity
      ? `${fields.activityId}
  ${fields.activity} {
    ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
  }`
      : ''
  }
  
  ${
    relationBuilders.buildNoteFragment && relationFields.noteFields && fields.note
      ? `${fields.noteId}
  ${fields.note} {
    ${relationBuilders.buildNoteFragment(relationFields.noteFields)}
  }`
      : ''
  }
`
}

export interface CommonDocumentQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
  accountIds?: string[]
  activityIds?: string[]
  contactIds?: string[]
  documentGroupIds?: string[]
  documentTypeIds?: string[]
  leadIds?: string[]
  noteIds?: string[]
  opportunityIds?: string[]
  parentDocumentIds?: string[]
  taskIds?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  authenticationDateFrom?: string
  authenticationDateTo?: string
  expirationDateFrom?: string
  expirationDateTo?: string
  verificationDateFrom?: string
  verificationDateTo?: string
}

/**
 * Build Document query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 */
export const buildDocumentQuery = (
  fields: typeof DocumentFields = DocumentFields,
  fragment: string = buildDocumentFragment(fields),
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
 * Build Document by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param byPkName - GraphQL ByPk name (optional, defaults to '{entityName}ByPk')
 */
export const buildDocumentByIdQuery = (
  fields: typeof DocumentFields = DocumentFields,
  fragment: string = buildDocumentFragment(fields),
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
 * Build Document search query
 * @param entityName - GraphQL entity name (REQUIRED)
 */
export const buildDocumentSearchQuery = (
  fields: typeof DocumentFields = DocumentFields,
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
 * Build WHERE condition for Document queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildDocumentWhereCondition = (
  variables: CommonDocumentQueryVariables = {},
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
 * Build ORDER BY for Document queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildDocumentOrderBy = (
  orderBy: CommonDocumentQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}
