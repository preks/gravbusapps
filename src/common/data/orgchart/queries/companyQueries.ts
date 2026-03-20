/**
 * Company Queries
 * GraphQL fragment builder for Company entities following the Investment pattern
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { COMPANY_ADDRESS_FIELDS } from './fragments/companyAddressFragments'
import { CompanyFields } from '../types/companyTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// ==========================================
// COMPANY AUDIT FIELDS
// ==========================================

/**
 * Company Audit Fields
 * Only includes fields that exist in the GraphQL schema
 * Company type does NOT have: createdBy, updatedBy, recordState, activeFrom, activeTo
 */
export const COMPANY_AUDIT_FIELDS = `
  createdAt
  updatedAt
  isDeleted
  version
`

/**
 * EmployeeCompany Audit Fields
 * EmployeeCompany does NOT have: isDeleted, createdBy, updatedBy
 */
export const EMPLOYEE_COMPANY_AUDIT_FIELDS = `
  createdAt
  updatedAt
  version
`

// ==========================================
// QUERY CONFIGURATIONS
// ==========================================

/**
 * Pre-defined Query Configurations
 * Alphabetically sorted, objects listed with their IDs/Refs together
 * NOTE: Only includes fields that exist in GraphQL schema
 */
export const COMPANY_QUERY_CONFIGS: Record<string, string[]> = {
  // Minimal: Only essential fields for quick lookups
  minimal: ['code', 'createdAt', 'id', 'name'],

  // List: Common fields for table/list views
  list: ['code', 'createdAt', 'description', 'id', 'name', 'structureId', 'updatedAt'],

  // Record: Full company record with all available fields and relations
  record: [
    'additionalProperties',
    'addresses',
    'childRelationships',
    'code',
    'commercialRegistrationNumber',
    'companyEmployee',
    'createdAt',
    'currency',
    'currencyRef',
    'description',
    'director',
    'directorId',
    'documents',
    'id',
    'isDeleted',
    'name',
    'organizationalUnits',
    'parentRelationships',
    'picture',
    'pictureThumbnail',
    'structureId',
    'taxIdentificationNumber',
    'taxNumber',
    'updatedAt',
    'valueAddedTaxNumber',
    'version'
  ]
}

// ==========================================
// FRAGMENT BUILDER HELPERS
// ==========================================

/**
 * Build base company fields (basic info, tax, additional properties)
 */
const buildBaseFields = (fieldSet: Set<string>): string[] => {
  const baseFields: string[] = []

  // Core fields
  if (fieldSet.has('id')) baseFields.push('id')
  if (fieldSet.has('code')) baseFields.push(CompanyFields.code)
  if (fieldSet.has('name')) baseFields.push(CompanyFields.name)
  if (fieldSet.has('description')) baseFields.push(CompanyFields.description)
  if (fieldSet.has('structureId')) baseFields.push(CompanyFields.structureId)

  // Tax fields
  if (fieldSet.has('commercialRegistrationNumber')) baseFields.push(CompanyFields.commercialRegistrationNumber)
  if (fieldSet.has('taxIdentificationNumber')) baseFields.push(CompanyFields.taxIdentificationNumber)
  if (fieldSet.has('taxNumber')) baseFields.push(CompanyFields.taxNumber)
  if (fieldSet.has('valueAddedTaxNumber')) baseFields.push(CompanyFields.valueAddedTaxNumber)

  // Additional fields
  if (fieldSet.has('additionalProperties')) baseFields.push('additionalProperties')
  if (fieldSet.has('picture')) baseFields.push('picture')
  if (fieldSet.has('pictureThumbnail')) baseFields.push('pictureThumbnail')
  if (fieldSet.has('directorId')) baseFields.push('directorId')
  if (fieldSet.has('currencyRef')) baseFields.push('currencyRef')

  return baseFields
}

/**
 * Build relation fields (director, currency, addresses)
 */
const buildRelationFields = (fieldSet: Set<string>): string => {
  const parts: string[] = []

  if (fieldSet.has('director')) {
    parts.push(`
      director {
        ${EMPLOYEE_REF}
      }
    `)
  }

  if (fieldSet.has('currency')) {
    parts.push(`
      currency {
        ${CATALOG_ENTRY}
      }
    `)
  }

  if (fieldSet.has('addresses')) {
    parts.push(`
      addresses(where: { isDeleted: { _eq: false } }) {
        ${COMPANY_ADDRESS_FIELDS}
      }
    `)
  }

  return parts.join('\n')
}

/**
 * Build nested relation fields (parent/child relationships, documents, employees, org units)
 */
const buildNestedRelationFields = (fieldSet: Set<string>): string => {
  const parts: string[] = []

  if (fieldSet.has('parentRelationships')) {
    parts.push(`
      parentRelationships {
        id
        parentId
        percentage
        structureId
        parentCompany {
          id
          code
          name
        }
      }
    `)
  }

  if (fieldSet.has('childRelationships')) {
    parts.push(`
      childRelationships {
        id
        childId
        percentage
        structureId
        childCompany {
          id
          code
          name
        }
      }
    `)
  }

  if (fieldSet.has('documents')) {
    parts.push(`
      documents(where: { isDeleted: { _eq: false } }) {
        id
        name
        folder
      }
    `)
  }

  if (fieldSet.has('companyEmployee')) {
    parts.push(`
      ${CompanyFields.companyEmployee} {
        id
        version
        employeeId
        employee {
          ${EMPLOYEE_REF}
        }
        ${EMPLOYEE_COMPANY_AUDIT_FIELDS}
      }
    `)
  }

  if (fieldSet.has('organizationalUnits')) {
    parts.push(`
      ${CompanyFields.organizationalUnits}(where: { isDeleted: { _eq: false } }) {
        id
        version
        name
        code
        description
        ${COMPANY_AUDIT_FIELDS}
      }
    `)
  }

  return parts.join('\n')
}

// ==========================================
// FRAGMENT BUILDER
// ==========================================

/**
 * Build Company Query Fragment from field array
 * Uses CompanyFields to map field keys to GraphQL field names
 */
export const buildCompanyFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  // Build base fields using helper
  const baseFields = buildBaseFields(fieldSet)

  // Add audit fields only if any audit field is requested
  const needsAuditFields =
    fieldSet.has('createdAt') || fieldSet.has('updatedAt') || fieldSet.has('isDeleted') || fieldSet.has('version')
  const auditFields = needsAuditFields ? COMPANY_AUDIT_FIELDS : ''

  // Build relation and nested relation fields using helpers
  const relationFields = buildRelationFields(fieldSet)
  const nestedRelationFields = buildNestedRelationFields(fieldSet)

  return `
    ${baseFields.join('\n    ')}
    ${auditFields}
    ${relationFields}
    ${nestedRelationFields}
  `
}

// ==========================================
// QUERY VARIABLES
// ==========================================

/**
 * Company Query Variables Interface
 * Extends BaseQueryVariables - all filter keys are defined in COMPANY_DESCRIPTORS
 * buildWhere automatically handles all filters defined in descriptors
 *
 * Supported filter keys (from COMPANY_DESCRIPTORS):
 * - structureIds (kind: 'inIds')
 * - directorIds (kind: 'inIds')
 * - createdAtFrom, createdAtTo (from BASE_ENTITY_DESCRIPTORS, kind: 'dateFrom'/'dateTo')
 *
 * Query building (where, orderBy, limit, offset) is handled by hooks using buildWhere and buildOrderBy.
 */
export interface CompanyQueryVariables extends BaseQueryVariables {
  // All filter keys are automatically handled by buildWhere using COMPANY_DESCRIPTORS
  // Structure filter
  structureIds?: string[]

  // Director filter
  directorIds?: string[]
}
