/**
 * Common Lead Queries
 * GraphQL queries for Lead entities using fields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import { LeadFields } from '../types/leadTypes'
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
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - LeadFields mapping (default: LeadFields)
 * @param additionalFields - Additional domain-specific fields (optional)
 * @param additionalQueries - Additional query fields (optional)
 * @returns GraphQL query string using variables
 */
export const buildLeadQuery = (
  entityName: string,
  entityFields: Record<keyof typeof LeadFields, string> = LeadFields,
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
        ${entityFields.academicTitle} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.academicTitleRef}
        ${entityFields.addressLine}
        ${entityFields.code}
        ${entityFields.companyEmail}
        ${entityFields.companyName}
        ${entityFields.companyPhone}
        ${entityFields.companyWebsite}
        ${entityFields.companySize} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.companySizeRef}
        ${entityFields.accountAnnualRevenueBand} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.accountAnnualRevenueBandRef}
        ${entityFields.conversionDate}
        ${entityFields.country} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.countryRef}
        ${entityFields.description}
        ${entityFields.email}
        ${entityFields.firstName}
        ${entityFields.id}
        ${entityFields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.industryClassRef}
        ${entityFields.lastName}
        ${entityFields.leadRating} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.leadRatingRef}
        ${entityFields.leadSource} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.leadSourceRef}
        ${entityFields.leadStatus} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.leadStatusRef}
        ${entityFields.locality}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.legalForm} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.legalFormRef}
        ${entityFields.ownerEmployeeId}
        ${entityFields.phoneNumber}
        ${entityFields.secondaryNumber}
        ${entityFields.linkedinUrl}
        ${entityFields.jobPosition}
        ${entityFields.postalCode}
        ${entityFields.region} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.regionRef}
        ${entityFields.salutation} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.salutationRef}
        ${entityFields.sensitive}
        ${entityFields.sourceCompanyName}
        ${entityFields.sourceIndividualName}
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
 * Build Lead Statuses query body (to be combined with main query)
 * @param catalogIdentifier - Catalog identifier for lead statuses (e.g., 'SalesLeadStatus', 'InvestmentLeadStatus')
 * @returns GraphQL query body string (without query wrapper) for combining with main queries
 */
export const buildLeadStatusesQuery = (catalogIdentifier: string): string => {
  return `
    leadStatuses: CatalogEntry(
      where: {
        _and: [
          { catalog: { identifier: { _eq: "${catalogIdentifier}" }, version: { _eq: "v1" } } },
          { isDeleted: { _eq: false } }
        ]
      }
      orderBy: { alternativeCode: ASC }
    ) {
      id
      code
      value
      alternativeCode
    }
  `
}

/**
 * Build Lead by ID query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - LeadFields mapping (default: LeadFields)
 * @param relationBuilders - Object containing fragment builder functions for relations (optional)
 * @param relationFields - Object containing field mappings for relations (optional)
 * @param additionalFields - Additional domain-specific fields (optional)
 */
export const buildLeadByIdQuery = (
  entityName: string,
  entityFields: Record<keyof typeof LeadFields, string> = LeadFields,
  relationBuilders?: LeadRelationBuilders,
  relationFields?: LeadRelationFields,
  additionalFields?: string
): string => {
  // Base fields inline
  const baseFields = `
        ${AUDIT_FIELDS}
        ${entityFields.academicTitle} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.academicTitleRef}
        ${entityFields.addressLine}
        ${entityFields.code}
        ${entityFields.companyEmail}
        ${entityFields.companyName}
        ${entityFields.companyPhone}
        ${entityFields.companyWebsite}
        ${entityFields.companySize} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.companySizeRef}
        ${entityFields.accountAnnualRevenueBand} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.accountAnnualRevenueBandRef}
        ${entityFields.conversionDate}
        ${entityFields.country} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.countryRef}
        ${entityFields.description}
        ${entityFields.email}
        ${entityFields.firstName}
        ${entityFields.id}
        ${entityFields.industryClass} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.industryClassRef}
        ${entityFields.lastName}
        ${entityFields.leadRating} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.leadRatingRef}
        ${entityFields.leadSource} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.leadSourceRef}
        ${entityFields.leadStatus} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.leadStatusRef}
        ${entityFields.locality}
        ${entityFields.ownerEmployee} {
          ${EMPLOYEE_REF}
        }
        ${entityFields.legalForm} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.legalFormRef}
        ${entityFields.ownerEmployeeId}
        ${entityFields.phoneNumber}
        ${entityFields.secondaryNumber}
        ${entityFields.linkedinUrl}
        ${entityFields.jobPosition}
        ${entityFields.postalCode}
        ${entityFields.region} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.regionRef}
        ${entityFields.salutation} {
          ${CATALOG_ENTRY}
        }
        ${entityFields.salutationRef}
        ${entityFields.sensitive}
        ${entityFields.sourceCompanyName}
        ${entityFields.sourceIndividualName}
  `

  // Common entity relations
  const commonRelations =
    relationBuilders && relationFields
      ? `
    # Common entity relations (present in both IRM and CRM)
    ${entityFields.activities}(where: { isDeleted: { _eq: false } }) {
      ${relationBuilders.buildActivityFragment(relationFields.activityFields)}
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
    
    # Converted relations (for leads that were converted)
    ${
      relationBuilders.buildAccountFragment && relationFields.accountFields && entityFields.convertedAccount
        ? `${entityFields.convertedAccountId}
      ${entityFields.convertedAccount} {
        ${relationBuilders.buildAccountFragment(relationFields.accountFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildContactFragment && relationFields.contactFields && entityFields.convertedContact
        ? `${entityFields.convertedContactId}
      ${entityFields.convertedContact} {
        ${relationBuilders.buildContactFragment(relationFields.contactFields)}
      }`
        : ''
    }
    
    ${
      relationBuilders.buildOpportunityFragment && relationFields.opportunityFields && entityFields.convertedOpportunity
        ? `${entityFields.convertedOpportunityId}
      ${entityFields.convertedOpportunity} {
        ${relationBuilders.buildOpportunityFragment(relationFields.opportunityFields)}
      }`
        : ''
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
 * Build Lead search query
 * @param entityName - GraphQL entity name (REQUIRED)
 * @param entityFields - LeadFields mapping (default: LeadFields)
 */
export const buildLeadSearchQuery = (
  entityName: string,
  entityFields: Record<keyof typeof LeadFields, string> = LeadFields
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
        ${entityFields.companyName}
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
