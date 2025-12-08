/**
 * Company Queries
 * GraphQL fragment builder for Company entities following the Investment pattern
 * Query building (where, orderBy, limit, offset) is handled by hooks
 */

import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { CompanyFields } from '../types/companyTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

// ==========================================
// COMPANY AUDIT FIELDS
// ==========================================

/**
 * Company Audit Fields
 * Only includes fields that exist in the GraphQL schema
 * Company type does NOT have: createdBy, updatedBy, recordState, activeFrom, activeTo, additionalProperties
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
    'code',
    'companyEmployee',
    'createdAt',
    'description',
    'id',
    'isDeleted',
    'name',
    'organizationalUnits',
    'structureId',
    'updatedAt',
    'version'
  ]
}

// ==========================================
// FRAGMENT BUILDER
// ==========================================

/**
 * Build Company Query Fragment from field array
 * Uses CompanyFields to map field keys to GraphQL field names
 * NOTE: Future fields are NOT included in fragment building (not yet in GraphQL schema)
 */
export const buildCompanyFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)

  // Build base fields - only include fields that exist in GraphQL schema
  const baseFields: string[] = []
  if (fieldSet.has('id')) baseFields.push('id')
  if (fieldSet.has('code')) baseFields.push(CompanyFields.code)
  if (fieldSet.has('name')) baseFields.push(CompanyFields.name)
  if (fieldSet.has('description')) baseFields.push(CompanyFields.description)
  if (fieldSet.has('structureId')) baseFields.push(CompanyFields.structureId)

  // Add audit fields only if any audit field is requested
  const needsAuditFields =
    fieldSet.has('createdAt') || fieldSet.has('updatedAt') || fieldSet.has('isDeleted') || fieldSet.has('version')
  const auditFields = needsAuditFields ? COMPANY_AUDIT_FIELDS : ''

  return `
    ${baseFields.join('\n    ')}
    ${auditFields}
    
    ${
      fieldSet.has('companyEmployee')
        ? `
      ${CompanyFields.companyEmployee} {
        id
        version
        employeeId
        employee {
          ${EMPLOYEE_REF}
        }
        ${EMPLOYEE_COMPANY_AUDIT_FIELDS}
      }
    `
        : ''
    }
    
    ${
      fieldSet.has('organizationalUnits')
        ? `
      ${CompanyFields.organizationalUnits}(where: { isDeleted: { _eq: false } }) {
        id
        version
        name
        code
        description
        ${COMPANY_AUDIT_FIELDS}
      }
    `
        : ''
    }
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
 * - createdAtFrom, createdAtTo (from BASE_ENTITY_DESCRIPTORS, kind: 'dateFrom'/'dateTo')
 *
 * Future filter keys (when GraphQL schema is updated):
 * - directorIds (kind: 'inIds')
 *
 * Query building (where, orderBy, limit, offset) is handled by hooks using buildWhere and buildOrderBy.
 */
export interface CompanyQueryVariables extends BaseQueryVariables {
  // All filter keys are automatically handled by buildWhere using COMPANY_DESCRIPTORS
  // Structure filter
  structureIds?: string[]

  // Future filters (not yet available in GraphQL schema)
  // directorIds?: string[]
}
