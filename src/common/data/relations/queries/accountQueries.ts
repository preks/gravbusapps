/**
 * Common Account Queries
 * GraphQL queries for Account entities using fields mapping
 * Supports different field names per domain (IRM vs CRM)
 */

import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { AccountFields } from '../types/accountTypes'
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { COMMUNICATION_CHANNEL_REF } from '@/common/data/common/queries/communicationChannelFragments'
import { ADDRESS_REF } from '@/common/data/common/queries/addressFragments'
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
  accountPriorityIds?: string[]
  countryIds?: string[]
  regionIds?: string[]

  // Date range filters
  foundationDateFrom?: string
  foundationDateTo?: string
}

/**
 * Build Account query with fields mapping
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - AccountFields mapping (default: AccountFields)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildAccountQuery = (
  entityName: string,
  entityFields: Record<keyof typeof AccountFields, string> = AccountFields,
  additionalFields?: string,
  additionalQueries?: string
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
        ${entityFields.accountAnnualRevenueBand} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.accountAnnualRevenueBandRef}
        ${entityFields.accountPriority} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.accountPriorityRef}
        ${entityFields.code}
        ${entityFields.companySize} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.companySizeRef}
        ${entityFields.foundationDate}
        ${entityFields.id}
        ${entityFields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          value
          valueExtension
          communicationChannel {
            ${CATALOG_ENTRY}
          }
          communicationChannelRef
        }
        ${entityFields.industryClassRef}
        ${entityFields.legalForm} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.legalFormRef}
        ${entityFields.liquidationDate}
        ${entityFields.name}      
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.pictureThumbnail}
        ${entityFields.timeZone} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.timeZoneRef}
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
 * Build Account by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param id - Account ID
 * @param entityFields - AccountFields mapping (default: AccountFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (addresses, activities, etc.) (optional)
 */
export const buildAccountByPkQuery = (
  entityName: string,
  entityFields: Record<keyof typeof AccountFields, string> = AccountFields,
  relationBuilders?: AccountRelationBuilders,
  relationFields?: AccountRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline (wie bei buildAccountQuery, damit richtige fields verwendet werden)
  const baseFields = `
        ${AUDIT_FIELDS}
        ${entityFields.accountAnnualRevenueBand} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.accountAnnualRevenueBandRef}
        ${entityFields.accountPriority} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.accountPriorityRef}
        ${entityFields.code}
        ${entityFields.companySize} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.companySizeRef}
        ${entityFields.foundationDate}
        ${entityFields.id}
        ${entityFields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.industryClassRef}
        ${entityFields.legalForm} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.legalFormRef}
        ${entityFields.liquidationDate}
        ${entityFields.name}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.ownerEmployeeId}
        ${entityFields.pictureThumbnail}
        ${entityFields.timeZone} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.timeZoneRef}
        ${entityFields.website}
        ${entityFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          ${COMMUNICATION_CHANNEL_REF}
        }
  `

  // Common entity relations (built dynamically based on relationBuilders and relationFields)
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    

    
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
    
    # AccountContacts relation (field name varies: accountContacts vs investmentAccountContact)
    ${entityFields.accountContacts}(where: { isDeleted: { _eq: false } }) {
      id
      ${AUDIT_FIELDS}
      contactType
      contact {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
        # ✅ Relations direkt hier hinzufügen (nicht im Fragment)
        ${relationFields.contactFields.communicationChannels}(where: { isDeleted: { _eq: false } }) {
          ${COMMUNICATION_CHANNEL_REF}
        }
        ${relationFields.contactFields.addresses}(where: { isDeleted: { _eq: false } }) {
          ${ADDRESS_REF}
        }
      }
      contactId
      accountId
    }
    
    # Leads relation (only in IRM, field name: leads vs investmentLead)
    ${buildLeadsRelationFragment(relationBuilders, relationFields, entityFields)}
    
    # Opportunities relation (present in both, field name varies: opportunities vs investmentOpportunity vs opportunity)
    ${buildOpportunitiesRelationFragment(relationBuilders, relationFields, entityFields)}
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
 * Build Account search query (minimal fields for quick search)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - AccountFields mapping (default: AccountFields)
 * @returns GraphQL query string using variables
 */
export const buildAccountSearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof AccountFields, string> = AccountFields
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
        ${entityFields.name}
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

/**
 * Helper function to build leads relation fragment
 */
const buildLeadsRelationFragment = (
  relationBuilders?: AccountRelationBuilders,
  relationFields?: AccountRelationFields,
  entityFields?: Record<string, string>
): string => {
  if (relationBuilders?.buildLeadFragment && relationFields?.leadFields && entityFields?.leads) {
    return `${entityFields.leads}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildLeadFragment(relationFields.leadFields)}
    }`
  }
  return ''
}

/**
 * Helper function to build opportunities relation fragment
 */
const buildOpportunitiesRelationFragment = (
  relationBuilders?: AccountRelationBuilders,
  relationFields?: AccountRelationFields,
  entityFields?: Record<string, string>
): string => {
  if (relationBuilders?.buildOpportunityFragment && relationFields?.opportunityFields && entityFields?.opportunities) {
    return `${entityFields.opportunities}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
    }`
  }
  return ''
}
