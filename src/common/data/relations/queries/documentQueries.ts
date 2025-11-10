/**
 * Common Document Queries
 * GraphQL queries for Document entities using fields mapping
 */

import { DOCUMENT_REF } from '@/common/data/common/queries/documentFragments'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { DocumentFields } from '../types/documentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// =====================================================
// DOCUMENT RELATION TYPES
// =====================================================

/**
 * Document relation builders interface
 * Used by buildDocumentByIdQuery to build common entity relations
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

/**
 * Document relation fields interface
 * Used by buildDocumentByIdQuery to pass field mappings for relations
 */
export interface DocumentRelationFields {
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
  taskFields?: any // Optional: for task relation
  activityFields?: any // Optional: for activity relation
  noteFields?: any // Optional: for note relation
}

export interface CommonDocumentQueryVariables extends BaseQueryVariables {
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
  authenticationDateFrom?: string
  authenticationDateTo?: string
  expirationDateFrom?: string
  expirationDateTo?: string
  verificationDateFrom?: string
  verificationDateTo?: string
}

/**
 * Build Document query with fields mapping
 * @param fields - DocumentFields mapping (default: DocumentFields)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - Additional domain-specific fields (optional)
 * @param queryFields - Additional query fields (optional)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @returns GraphQL query string using variables
 */
export const buildDocumentQuery = (
  fields: typeof DocumentFields = DocumentFields,
  entityName: string,
  entityFields?: string,
  queryFields?: string,
  relationBuilders?: Partial<DocumentRelationBuilders>,
  relationFields?: Partial<DocumentRelationFields>
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

  // Optional relations (account, contact, lead, opportunity, task, activity, note)
  const references =
    relationBuilders && relationFields
      ? `
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
        ${DOCUMENT_REF}
        ${fields.source}
        ${fields.verified}
        ${fields.verificationDate}
        ${fields.authenticated}
        ${fields.authenticationDate}
        ${fields.mandatory}
        ${fields.expirationDate}
        ${entityFields || ''}
        ${references || ''}
        ${queryFields || ''}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${queryFields || ''}
    }
  `
}

/**
 * Build Document by ID query
 * @param fields - DocumentFields mapping (default: DocumentFields)
 * @param id - Document ID
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param entityFields - Additional domain-specific fields (optional)
 */
export const buildDocumentByIdQuery = (
  fields: typeof DocumentFields = DocumentFields,
  id: string,
  entityName: string,
  relationBuilders?: DocumentRelationBuilders,
  relationFields?: DocumentRelationFields,
  entityFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${DOCUMENT_REF}
        ${fields.source}
        ${fields.verified}
        ${fields.verificationDate}
        ${fields.authenticated}
        ${fields.authenticationDate}
        ${fields.mandatory}
        ${fields.expirationDate}
  `

  // Optional relations (account, contact, lead, opportunity, task, activity, note)
  const commonRelations =
    relationBuilders && relationFields
      ? `
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

// =====================================================
// DOCUMENT BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Document query filtered by Lead ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByLeadIdQuery = (
  fields: typeof DocumentFields = DocumentFields,
  entityName: string,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  entityFields?: string
): string => {
  return buildDocumentQuery(fields, entityName, entityFields, undefined, relationBuilders, relationFields)
}

/**
 * Build Document query filtered by Account ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByAccountIdQuery = (
  fields: typeof DocumentFields = DocumentFields,
  entityName: string,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  entityFields?: string
): string => {
  return buildDocumentQuery(fields, entityName, entityFields, undefined, relationBuilders, relationFields)
}

/**
 * Build Document query filtered by Contact ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByContactIdQuery = (
  fields: typeof DocumentFields = DocumentFields,
  entityName: string,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  entityFields?: string
): string => {
  return buildDocumentQuery(fields, entityName, entityFields, undefined, relationBuilders, relationFields)
}

/**
 * Build Document query filtered by Opportunity ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByOpportunityIdQuery = (
  fields: typeof DocumentFields = DocumentFields,
  entityName: string,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  entityFields?: string
): string => {
  return buildDocumentQuery(fields, entityName, entityFields, undefined, relationBuilders, relationFields)
}
