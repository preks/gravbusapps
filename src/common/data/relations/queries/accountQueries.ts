/**
 * Common Account Queries
 * GraphQL queries for Account entities using fields mapping
 * Supports different field names per domain (IRM vs CRM)
 */

import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { AccountFields } from '../types/accountTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * Common Account Query Variables Interface
 */
export interface AccountQueryVariables extends BaseQueryVariables {
  // Filter fields
  ownerEmployeeIds?: string[]
  industryIds?: string[]
  legalFormIds?: string[]
  companySizeIds?: string[]
  revenueBandIds?: string[]
  countryIds?: string[]
  regionIds?: string[]

  // Date range filters
  foundationDateFrom?: string
  foundationDateTo?: string
}

/**
 * Build Account query with fields mapping
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param fragment - Optional fragment parameter
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param aggregateName - GraphQL aggregate name (optional, defaults to '{entityName}Aggregate')
 * @returns GraphQL query string using variables
 */
export const buildAccountQuery = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields,
  entityName: string,
  entityFields?: string,
  queryFields?: string
): string => {
  const boolExpType = `${entityName}BoolExp`
  const orderByType = `[${entityName}OrderBy!]`

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
        ${fields.accountAnnualRevenueBand} {
          ${CATALOG_ENTRY}
        }
        ${fields.accountAnnualRevenueBandRef}
        ${fields.code}
        ${fields.companySize} {
          ${CATALOG_ENTRY}
        }
        ${fields.companySizeRef}
        ${fields.foundationDate}
        ${fields.id}
        ${fields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${fields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          value
          valueExtension
          communicationChannel {
            ${CATALOG_ENTRY}
          }
          communicationChannelRef
        }
        ${fields.industryClassRef}
        ${fields.legalForm} {
          ${CATALOG_ENTRY}
        }
        ${fields.legalFormRef}
        ${fields.liquidationDate}
        ${fields.name}      
        ${fields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.ownerEmployeeId}
        ${fields.pictureThumbnail}
        ${fields.timeZone} {
          ${CATALOG_ENTRY}
        }
        ${fields.timeZoneRef}
        ${entityFields || ''}

      }
      ${entityName}Aggregate(where: $where) {
        aggregate { count }
      }
      ${queryFields || ''}
    }
  `
}

/**
 * Build Account by ID query
 * @param fields - AccountFields mapping (default: AccountFields)
 * @param id - Account ID
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param entityFields - Additional domain-specific fields (addresses, activities, etc.) (optional)
 */
export const buildAccountByPkQuery = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields,
  id: string,
  entityName: string,
  relationBuilders?: AccountRelationBuilders,
  relationFields?: AccountRelationFields,
  entityFields?: string // Additional domain-specific fields (addresses, activities, etc.)
): string => {
  // Base fields inline (wie bei buildAccountQuery, damit richtige fields verwendet werden)
  const baseFields = `
        ${AUDIT_FIELDS}
        ${fields.accountAnnualRevenueBand} {
          ${CATALOG_ENTRY}
        }
        ${fields.accountAnnualRevenueBandRef}
        ${fields.code}
        ${fields.companySize} {
          ${CATALOG_ENTRY}
        }
        ${fields.companySizeRef}
        ${fields.foundationDate}
        ${fields.id}
        ${fields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${fields.industryClassRef}
        ${fields.legalForm} {
          ${CATALOG_ENTRY}
        }
        ${fields.legalFormRef}
        ${fields.liquidationDate}
        ${fields.name}
        ${fields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.ownerEmployeeId}
        ${fields.pictureThumbnail}
        ${fields.timeZone} {
          ${CATALOG_ENTRY}
        }
        ${fields.timeZoneRef}
  `

  // Common entity relations (built dynamically based on relationBuilders and relationFields)
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    
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
  variables: AccountQueryVariables = {},
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
  orderBy: AccountQueryVariables['orderBy'] = [],
  descriptors: Descriptor[] = []
): any[] => {
  if (descriptors.length === 0) {
    throw new Error('Query Descriptor is missing')
  }
  return buildOrderBy(orderBy, descriptors)
}

// =====================================================
// ACCOUNT RELATION TYPES
// =====================================================

/**
 * Account relation builders interface
 * Used by buildAccountByPkQuery to build common entity relations
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

/**
 * Account relation fields interface
 * Used by buildAccountByPkQuery to pass field mappings for relations
 */
export interface AccountRelationFields {
  contactFields: any
  documentFields: any
  noteFields: any
  taskFields: any
  activityFields?: any // Optional: only in IRM
  leadFields?: any // Optional: only in IRM
  opportunityFields?: any // Optional: present in both but with different field names
}
