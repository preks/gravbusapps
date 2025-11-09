/**
 * Common Lead Queries
 * GraphQL queries for Lead entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { LeadFields } from '../types/leadTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// =====================================================
// LEAD RELATION TYPES
// =====================================================

/**
 * Lead relation builders interface
 * Used by buildLeadByIdQuery to build common entity relations
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

/**
 * Lead relation fields interface
 * Used by buildLeadByIdQuery to pass field mappings for relations
 */
export interface LeadRelationFields {
  activityFields: any
  documentFields: any
  noteFields: any
  taskFields: any
  accountFields?: any // Optional: for convertedAccount
  contactFields?: any // Optional: for convertedContact
  opportunityFields?: any // Optional: for convertedOpportunity
}

export interface CommonLeadQueryVariables extends BaseQueryVariables {
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
  conversionDateFrom?: string
  conversionDateTo?: string
}

/**
 * Build Lead query with fields mapping
 * @param fields - LeadFields mapping (default: LeadFields)
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - Additional domain-specific fields (optional)
 * @param queryFields - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildLeadQuery = (
  fields: typeof LeadFields = LeadFields,
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
        ${fields.academicTitle} {
          ${CATALOG_ENTRY}
        }
        ${fields.academicTitleRef}
        ${fields.addressLine}
        ${fields.code}
        ${fields.companyEmail}
        ${fields.companyName}
        ${fields.companyPhone}
        ${fields.companyWebsite}
        ${fields.conversionDate}
        ${fields.country} {
          ${CATALOG_ENTRY}
        }
        ${fields.countryRef}
        ${fields.description}
        ${fields.email}
        ${fields.firstName}
        ${fields.id}
        ${fields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${fields.industryClassRef}
        ${fields.lastName}
        ${fields.leadRating} {
          ${CATALOG_ENTRY}
        }
        ${fields.leadRatingRef}
        ${fields.leadSource} {
          ${CATALOG_ENTRY}
        }
        ${fields.leadSourceRef}
        ${fields.leadStatus} {
          ${CATALOG_ENTRY}
        }
        ${fields.leadStatusRef}
        ${fields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.ownerEmployeeId}
        ${fields.phoneNumber}
        ${fields.position}
        ${fields.postalCode}
        ${fields.region} {
          ${CATALOG_ENTRY}
        }
        ${fields.regionRef}
        ${fields.salutation} {
          ${CATALOG_ENTRY}
        }
        ${fields.salutationRef}
        ${fields.sensitive}
        ${fields.sourceCompanyName}
        ${fields.sourceIndividualName}
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
 * Build Lead by ID query
 * @param fields - LeadFields mapping (default: LeadFields)
 * @param id - Lead ID
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param entityFields - Additional domain-specific fields (optional)
 */
export const buildLeadByIdQuery = (
  fields: typeof LeadFields = LeadFields,
  id: string,
  entityName: string,
  relationBuilders?: LeadRelationBuilders,
  relationFields?: LeadRelationFields,
  entityFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${fields.academicTitle} {
          ${CATALOG_ENTRY}
        }
        ${fields.academicTitleRef}
        ${fields.addressLine}
        ${fields.code}
        ${fields.companyEmail}
        ${fields.companyName}
        ${fields.companyPhone}
        ${fields.companyWebsite}
        ${fields.conversionDate}
        ${fields.country} {
          ${CATALOG_ENTRY}
        }
        ${fields.countryRef}
        ${fields.description}
        ${fields.email}
        ${fields.firstName}
        ${fields.id}
        ${fields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${fields.industryClassRef}
        ${fields.lastName}
        ${fields.leadRating} {
          ${CATALOG_ENTRY}
        }
        ${fields.leadRatingRef}
        ${fields.leadSource} {
          ${CATALOG_ENTRY}
        }
        ${fields.leadSourceRef}
        ${fields.leadStatus} {
          ${CATALOG_ENTRY}
        }
        ${fields.leadStatusRef}
        ${fields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${fields.ownerEmployeeId}
        ${fields.phoneNumber}
        ${fields.position}
        ${fields.postalCode}
        ${fields.region} {
          ${CATALOG_ENTRY}
        }
        ${fields.regionRef}
        ${fields.salutation} {
          ${CATALOG_ENTRY}
        }
        ${fields.salutationRef}
        ${fields.sensitive}
        ${fields.sourceCompanyName}
        ${fields.sourceIndividualName}
  `

  // Common entity relations
  const commonRelations =
    relationBuilders && relationFields
      ? `
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
        ? `${fields.convertedAccountId}
      ${fields.convertedAccount} {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildContactFragment && relationFields.contactFields && fields.convertedContact
        ? `${fields.convertedContactId}
      ${fields.convertedContact} {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && fields.convertedOpportunity
        ? `${fields.convertedOpportunityId}
      ${fields.convertedOpportunity} {
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
