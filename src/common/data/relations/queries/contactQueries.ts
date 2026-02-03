/**
 * Common Contact Queries
 * GraphQL queries for Contact entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { ADDRESS_REF } from '@/common/data/common/queries/addressFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { ContactFields } from '../types/contactTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// =====================================================
// CONTACT RELATION TYPES
// =====================================================

/**
 * Contact relation builders interface
 * Used by buildContactByIdQuery to build common entity relations
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

/**
 * Contact relation fields interface
 * Used by buildContactByIdQuery to pass field mappings for relations
 */
export interface ContactRelationFields {
  activityFields: any
  accountFields: any
  documentFields: any
  leadFields: any
  noteFields: any
  opportunityFields: any
  taskFields: any
}

export interface CommonContactQueryVariables extends BaseQueryVariables {
  academicTitleIds?: string[]
  departmentIds?: string[]
  jobPositions?: string[]
  languageIds?: string[]
  ownerEmployeeIds?: string[]
  salutationIds?: string[]
  birthDateFrom?: string
  birthDateTo?: string
}

/**
 * Build Contact query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - ContactFields mapping (default: ContactFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildContactQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ContactFields, string> = ContactFields,
  relationBuilders?: Partial<ContactRelationBuilders>,
  relationFields?: Partial<ContactRelationFields>,
  additionalFields?: string,
  additionalQueries?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

  // AccountContacts relation (only if relationBuilders provided)
  const accountAddressFragment = ADDRESS_REF
  const accountContactsRelation =
    relationBuilders?.buildAccountFragment && relationFields?.accountFields
      ? `
    # AccountContacts relation (field name varies: accountContacts vs investmentAccountContact)
    ${entityFields.accountContacts}(where: { isDeleted: { _eq: false } }) {
      id
      ${AUDIT_FIELDS}
      contactType
      account {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
        # ✅ Relations direkt hier hinzufügen (nicht im Fragment)
        ${relationFields.accountFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          ${COMMUNICATION_CHANNEL_REF}
        }
        ${relationFields.accountFields.addresses}(where: { isDeleted: { _eq: false } }) {
          ${accountAddressFragment}
        }
      }
      accountId
      contactId
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
        ${entityFields.academicTitle} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.academicTitleRef}
        ${entityFields.birthDate}
        ${entityFields.code}
        ${entityFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          ${COMMUNICATION_CHANNEL_REF}
        }
        ${entityFields.department}
        ${entityFields.id}
        ${entityFields.firstName}
        ${entityFields.jobPosition}
        ${entityFields.language} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.languageRef}
        ${entityFields.lastName}
        ${entityFields.notesSummary}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.pictureThumbnail}
        ${entityFields.salutation} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.salutationRef}
        ${entityFields.type}
        ${accountContactsRelation}
        ${additionalFields || ''}
      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${additionalQueries || ''}
    }
  `
}

/**
 * Build Contact by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Contact ID
 * @param entityFields - ContactFields mapping (default: ContactFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (addresses, leads, etc.) (optional)
 */
export const buildContactByIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ContactFields, string> = ContactFields,
  relationBuilders?: ContactRelationBuilders,
  relationFields?: ContactRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${entityFields.academicTitle} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.academicTitleRef}
        ${entityFields.birthDate}
        ${entityFields.code}
        ${entityFields.department}
        ${entityFields.id}
        ${entityFields.firstName}
        ${entityFields.jobPosition}
        ${entityFields.language} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.languageRef}
        ${entityFields.lastName}
        ${entityFields.notesSummary}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.pictureThumbnail}
        ${entityFields.salutation} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.salutationRef}
        ${entityFields.type}
  `

  // Common entity relations
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    
    ${entityFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
      ${COMMUNICATION_CHANNEL_REF}
    }
    
    ${entityFields.documents}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
    }
    
    ${entityFields.notes}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildNoteFragment(relationFields.noteFields)}
    }
    
    ${entityFields.tasks}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildTaskFragment(relationFields.taskFields)}
      
      # Documents relation within tasks
      documents(where: { isDeleted: { _eq: false } }) {
        ${relationBuilders.buildDocumentFragment(relationFields.documentFields)}
      }
    }
    
    ${entityFields.activities}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
    }
    
    # AccountContacts relation (field name varies: accountContacts vs investmentAccountContact)
    ${entityFields.accountContacts}(where: { isDeleted: { _eq: false } }) {
      id
      ${AUDIT_FIELDS}
      contactType
      account {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
        # ✅ Relations direkt hier hinzufügen (nicht im Fragment)
        ${relationFields.accountFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          ${COMMUNICATION_CHANNEL_REF}
        }
        ${relationFields.accountFields.addresses}(where: { isDeleted: { _eq: false } }) {
          ${ADDRESS_REF}
        }
      }
        accountId
        contactId
    }
    
    # OpportunityContacts relation (field name varies: opportunityContacts vs investmentOpportunityContact)
    ${entityFields.opportunityContacts}(where: { isDeleted: { _eq: false } }) {
      id
      ${AUDIT_FIELDS}
      contactType
      opportunity {
        ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
      }
    }
  `
      : ''

  return `
    query Get${entityName}ById($id: uuid!) {
      ${entityName}ByPk(id: $id) {
        ${baseFields}
        ${commonRelations}
        ${additionalFields || ''}
      }
    }
  `
}

/**
 * Build Contact search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - ContactFields mapping (default: ContactFields)
 */
export const buildContactSearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof ContactFields, string> = ContactFields
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
        ${entityFields.code}
        ${entityFields.firstName}
        ${entityFields.lastName}
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
