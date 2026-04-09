/**
 * Common Note Queries
 * GraphQL queries for Note entities using fields mapping
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { NoteFields } from '../types/noteTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// =====================================================
// NOTE RELATION TYPES
// =====================================================

/**
 * Note relation builders interface
 * Used by buildNoteByIdQuery to build common entity relations
 */
export interface NoteRelationBuilders {
  buildDocumentFragment: (fields: any) => string
  buildAccountFragment?: (fields: any) => string // Optional: for account relation
  buildContactFragment?: (fields: any) => string // Optional: for contact relation
  buildLeadFragment?: (fields: any) => string // Optional: for lead relation
  buildOpportunityFragment?: (fields: any) => string // Optional: for opportunity relation
}

/**
 * Note relation fields interface
 * Used by buildNoteByIdQuery to pass field mappings for relations
 */
export interface NoteRelationFields {
  documentFields: any
  accountFields?: any // Optional: for account relation
  contactFields?: any // Optional: for contact relation
  leadFields?: any // Optional: for lead relation
  opportunityFields?: any // Optional: for opportunity relation
}

export interface CommonNoteQueryVariables extends BaseQueryVariables {
  accountIds?: string[]
  authorEmployeeIds?: string[]
  contactIds?: string[]
  leadIds?: string[]
  opportunityIds?: string[]
  reminderDateFrom?: string
  reminderDateTo?: string
}

/**
 * Build Note query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - NoteFields mapping (default: NoteFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildNoteQuery = (
  entityName: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields,
  relationBuilders?: Partial<NoteRelationBuilders>,
  relationFields?: Partial<NoteRelationFields>,
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
    ${
      relationBuilders.buildDocumentFragment && relationFields.documentFields && entityFields.documents
        ? `${entityFields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
      }`
        : ''
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
        ${entityFields.authorEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.authorEmployeeId}
        ${entityFields.id}
        ${entityFields.reminderDate}
        ${entityFields.source}
        ${entityFields.title}
        ${entityFields.text}
        ${entityFields.noteType}
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
 * Build Note by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Note ID
 * @param entityFields - NoteFields mapping (default: NoteFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 */
export const buildNoteByIdQuery = (
  entityName: string,
  id: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields,
  relationBuilders?: NoteRelationBuilders,
  relationFields?: NoteRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${entityFields.authorEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.authorEmployeeId}
        ${entityFields.id}
        ${entityFields.reminderDate}
        ${entityFields.source}
        ${entityFields.text}
        ${entityFields.title}
        ${entityFields.noteType}
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
 * Build Note search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - NoteFields mapping (default: NoteFields)
 */
export const buildNoteSearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields
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
        ${entityFields.text}
      }
    }
  `
}

/**
 * Build WHERE condition for Note queries
 * @param variables - Query variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @param customConditions - Additional custom WHERE conditions
 * @returns WHERE condition object for GraphQL variables
 */
export const buildNoteWhereCondition = (
  variables: CommonNoteQueryVariables = {},
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
 * Build ORDER BY for Note queries
 * @param orderBy - Order by array from variables
 * @param descriptors - Descriptors to use (MUST be provided by consumer)
 * @returns ORDER BY array for GraphQL variables
 */
export const buildNoteOrderBy = (
  orderBy: CommonNoteQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}

// =====================================================
// NOTE BY ENTITY ID QUERY BUILDERS
// =====================================================

/**
 * Build Note query filtered by Lead ID
 * Uses buildNoteQuery and ensures all relations (including documents) are included
 */
export const buildNoteByLeadIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields,
  relationBuilders: Partial<NoteRelationBuilders>,
  relationFields: Partial<NoteRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildNoteQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}

/**
 * Build Note query filtered by Account ID
 * Uses buildNoteQuery and ensures all relations (including documents) are included
 */
export const buildNoteByAccountIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields,
  relationBuilders: Partial<NoteRelationBuilders>,
  relationFields: Partial<NoteRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildNoteQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}

/**
 * Build Note query filtered by Contact ID
 * Uses buildNoteQuery and ensures all relations (including documents) are included
 */
export const buildNoteByContactIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields,
  relationBuilders: Partial<NoteRelationBuilders>,
  relationFields: Partial<NoteRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildNoteQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}

/**
 * Build Note query filtered by Opportunity ID
 * Uses buildNoteQuery and ensures all relations (including documents) are included
 */
export const buildNoteByOpportunityIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof NoteFields, string> = NoteFields,
  relationBuilders: Partial<NoteRelationBuilders>,
  relationFields: Partial<NoteRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  return buildNoteQuery(entityName, entityFields, relationBuilders, relationFields, additionalFields, additionalQueries)
}
