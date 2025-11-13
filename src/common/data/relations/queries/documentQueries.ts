/**
 * Common Document Queries
 * GraphQL queries for Document entities using fields mapping
 */

import { DOCUMENT_REF } from '@/common/data/common/queries/documentFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { DocumentFields } from '../types/documentTypes'
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
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - DocumentFields mapping (default: DocumentFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildDocumentQuery = (
  entityName: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders?: Partial<DocumentRelationBuilders>,
  relationFields?: Partial<DocumentRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

  // Optional relations (account, contact, lead, opportunity, task, activity, note)
  const references =
    relationBuilders && relationFields
      ? `
    # Optional relations (account, contact, lead, opportunity, task, activity, note)
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
    ${
      relationBuilders.buildTaskFragment && relationFields.taskFields && entityFields.task
        ? `${entityFields.taskId}
      ${entityFields.task} {
        ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildActivityFragment && relationFields.activityFields && entityFields.activity
        ? `${entityFields.activityId}
      ${entityFields.activity} {
        ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
      }`
        : ''
    }
    ${
      relationBuilders.buildNoteFragment && relationFields.noteFields && entityFields.note
        ? `${entityFields.noteId}
      ${entityFields.note} {
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
        ${entityFields.source}
        ${entityFields.verified}
        ${entityFields.verificationDate}
        ${entityFields.authenticated}
        ${entityFields.authenticationDate}
        ${entityFields.mandatory}
        ${entityFields.expirationDate}
        ${entityFields.parentDocument} {
          ${DOCUMENT_REF}
        }
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
 * Build Document by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Document ID
 * @param entityFields - DocumentFields mapping (default: DocumentFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 */
export const buildDocumentByIdQuery = (
  entityName: string,
  id: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders?: DocumentRelationBuilders,
  relationFields?: DocumentRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${DOCUMENT_REF}
        ${entityFields.source}
        ${entityFields.verified}
        ${entityFields.verificationDate}
        ${entityFields.authenticated}
        ${entityFields.authenticationDate}
        ${entityFields.mandatory}
        ${entityFields.expirationDate}
  `

  // Optional relations (account, contact, lead, opportunity, task, activity, note)
  const commonRelations =
    relationBuilders && relationFields
      ? `
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
    
    ${
      relationBuilders.buildTaskFragment && relationFields.taskFields && entityFields.task
        ? `${entityFields.taskId}
      ${entityFields.task} {
        ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildActivityFragment && relationFields.activityFields && entityFields.activity
        ? `${entityFields.activityId}
      ${entityFields.activity} {
        ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildNoteFragment && relationFields.noteFields && entityFields.note
        ? `${entityFields.noteId}
      ${entityFields.note} {
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
        ${additionalFields || ''}
      }
    }
  `
}

/**
 * Build Document search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - DocumentFields mapping (default: DocumentFields)
 */
export const buildDocumentSearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields
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
  entityName: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildDocumentQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}

/**
 * Build Document query filtered by Account ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByAccountIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildDocumentQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}

/**
 * Build Document query filtered by Contact ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByContactIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildDocumentQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}

/**
 * Build Document query filtered by Opportunity ID
 * Uses buildDocumentQuery and ensures all relations are included
 */
export const buildDocumentByOpportunityIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof DocumentFields, string> = DocumentFields,
  relationBuilders: Partial<DocumentRelationBuilders>,
  relationFields: Partial<DocumentRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildDocumentQuery(
    entityName,
    entityFields,
    relationBuilders,
    relationFields,
    additionalFields,
    additionalQueries
  )
}
