/**
 * Company Types
 * Type definitions for Company entities following the Investment pattern
 */

import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

// ==========================================
// COMPANY ADDRESS TYPE
// ==========================================

export interface CompanyAddress extends BaseEntity {
  id: string
  streetAddress?: string
  locality?: string
  postalCode?: string
  region?: CatalogEntry
  country?: CatalogEntry
  addressType?: CatalogEntry
  companyId?: string
}

// ==========================================
// COMPANY RELATIONSHIP TYPE
// ==========================================

export interface CompanyRelationship extends BaseEntity {
  id: string
  parentCompanyId?: string
  childCompanyId?: string
  relationshipType?: CatalogEntry
  percentage?: number
  parentCompany?: Company
  childCompany?: Company
}

// ==========================================
// COMPANY TYPE
// ==========================================

/**
 * Company Type
 * Extends BaseEntity - includes future fields that are not yet in GraphQL schema
 */
export interface Company extends BaseEntity {
  id: string

  // Company Core Fields (currently available)
  name: string
  code?: string
  description?: string
  structureId?: string

  // Future Fields (defined but NOT queried yet)
  directorId?: string
  director?: Employee
  commercialRegistrationNumber?: string
  taxIdentificationNumber?: string
  taxNumber?: string
  valueAddedTaxNumber?: string
  additionalProperties?: string | Record<string, any>

  // Relationships (currently available)
  companyEmployee?: CompanyEmployee[]
  organizationalUnits?: OrganizationalUnit[]

  // Future Relationships (defined but NOT queried yet)
  companyAddress?: CompanyAddress[]
  parentCompanies?: CompanyRelationship[]
  childCompanies?: CompanyRelationship[]
}

// ==========================================
// COMPANY EMPLOYEE TYPE
// ==========================================

export interface CompanyEmployee extends BaseEntity {
  id: string
  employeeId?: string
  companyId?: string
  employee?: Employee
}

// ==========================================
// ORGANIZATIONAL UNIT TYPE
// ==========================================

export interface OrganizationalUnit extends BaseEntity {
  id: string
  name: string
  code?: string
  description?: string
  companyId?: string
}

// ==========================================
// COMPANY FIELDS
// ==========================================

/**
 * Company Fields
 * ALL fields including future fields (BaseEntity fields NOT included - handled by BASE_ENTITY_DESCRIPTORS)
 */
export const CompanyFields = {
  // Company Core Fields
  code: 'code',
  name: 'name',
  description: 'description',
  structureId: 'structureId',

  // Future Fields (not yet in GraphQL schema)
  directorId: 'directorId',
  director: 'director',
  commercialRegistrationNumber: 'commercialRegistrationNumber',
  taxIdentificationNumber: 'taxIdentificationNumber',
  taxNumber: 'taxNumber',
  valueAddedTaxNumber: 'valueAddedTaxNumber',

  // Relationships
  companyEmployee: 'companyEmployee',
  organizationalUnits: 'organizationalUnits',

  // Future Relationships
  companyAddress: 'companyAddress',
  parentCompanies: 'parentCompanies',
  childCompanies: 'childCompanies'
} as const

// ==========================================
// COMPANY FORM FIELDS
// ==========================================

/**
 * Company Form Fields
 * Only input-capable fields for form input
 */
export const CompanyFormFields = {
  // Base Entity Fields (for form input)
  id: 'id',
  createdAt: 'createdAt',
  createdBy: 'createdBy',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
  isDeleted: 'isDeleted',
  recordState: 'recordState',
  activeFrom: 'activeFrom',
  activeTo: 'activeTo',
  version: 'version',
  additionalProperties: 'additionalProperties',

  // Company Core Fields
  code: 'code',
  name: 'name',
  description: 'description',
  structureId: 'structureId',

  // Future Fields
  directorId: 'director',
  commercialRegistrationNumber: 'commercialRegistrationNumber',
  taxIdentificationNumber: 'taxIdentificationNumber',
  taxNumber: 'taxNumber',
  valueAddedTaxNumber: 'valueAddedTaxNumber'
} as const

// ==========================================
// COMPANY DESCRIPTORS
// ==========================================

/**
 * Create Company Descriptors
 * Descriptors for search, sort, and filter functionality
 */
export const createCompanyDescriptors = (
  fields: Record<keyof typeof CompanyFields, string> = CompanyFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  // Company Core Fields
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  { key: 'structureId', searchPaths: [fields.structureId], sortPath: fields.structureId, type: 'text' },

  // Future Fields (descriptors defined for when they become available)
  {
    key: 'commercialRegistrationNumber',
    searchPaths: [fields.commercialRegistrationNumber],
    sortPath: fields.commercialRegistrationNumber,
    type: 'text'
  },
  {
    key: 'taxIdentificationNumber',
    searchPaths: [fields.taxIdentificationNumber],
    sortPath: fields.taxIdentificationNumber,
    type: 'text'
  },
  { key: 'taxNumber', searchPaths: [fields.taxNumber], sortPath: fields.taxNumber, type: 'text' },
  {
    key: 'valueAddedTaxNumber',
    searchPaths: [fields.valueAddedTaxNumber],
    sortPath: fields.valueAddedTaxNumber,
    type: 'text'
  },

  // Entity References (future)
  {
    key: 'director',
    searchPaths: [`${fields.director}.displayName`, `${fields.director}.firstName`, `${fields.director}.lastName`],
    sortPath: `${fields.director}.displayName`,
    type: 'text'
  },

  // Filter IDs (future)
  {
    key: 'directorIds',
    path: fields.directorId,
    filterLabel: 'Director',
    optionSelectPaths: [`${fields.director}.id`, `${fields.director}.displayName`],
    optionSearchPaths: [
      `${fields.director}.displayName`,
      `${fields.director}.firstName`,
      `${fields.director}.lastName`
    ],
    optionDistinctOn: [fields.directorId],
    kind: 'inIds'
  },

  // Structure ID filter
  {
    key: 'structureIds',
    path: fields.structureId,
    filterLabel: 'Structure',
    kind: 'inIds'
  }
]

/**
 * Default Company Descriptors
 */
export const COMPANY_DESCRIPTORS = createCompanyDescriptors()
