/**
 * Company Types
 * Type definitions for Company entities following the Investment pattern
 */

import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import {
  type Document,
  DocumentFields,
  DocumentFormFields,
  createDocumentDescriptors
} from '@/common/data/relations/types/documentTypes'

// ==========================================
// COMPANY ADDRESS TYPE
// ==========================================

export interface CompanyAddress extends BaseEntity {
  id: string
  addressLine?: Record<string, any> // jsonb field containing streetAddress, addressLine2, etc.
  locality?: string
  postalCode?: string
  regionRef?: string
  region?: CatalogEntry
  countryRef?: string
  country?: CatalogEntry
  addressType?: string
  companyId?: string
}

// ==========================================
// COMPANY RELATIONSHIP TYPE
// ==========================================

export interface CompanyRelationship extends BaseEntity {
  id: string
  parentId?: string
  childId?: string
  percentage?: number
  structureId?: string
  parentCompany?: Company
  childCompany?: Company
}

// ==========================================
// COMPANY DOCUMENT TYPE
// ==========================================

/**
 * Company Document
 * Extends base Document type with company-specific relations
 */
export interface CompanyDocument extends Document {
  company?: Company
  companyId?: string
}

/**
 * Company Document Field Mapping
 * Extends DocumentFields with company-specific fields
 */
export const CompanyDocumentFields = {
  ...DocumentFields,
  company: 'company',
  companyId: 'companyId'
} as const

/**
 * Company Document Form Fields
 * Extends DocumentFormFields with company-specific fields
 */
export const CompanyDocumentFormFields = {
  ...DocumentFormFields,
  companyId: 'company'
} as const

/**
 * Company Document Descriptors
 * Uses createDocumentDescriptors with CompanyDocumentFields mapping
 */
export const COMPANY_DOCUMENT_DESCRIPTORS: Descriptor[] = [...createDocumentDescriptors(CompanyDocumentFields)]

// ==========================================
// COMPANY TYPE
// ==========================================

/**
 * Company Type
 * Extends BaseEntity - all fields available in GraphQL schema
 */
export interface Company extends BaseEntity {
  id: string

  // Core Fields
  name: string
  code?: string
  description?: string
  structureId?: string

  // Legal/Tax Fields
  directorId?: string
  director?: Employee
  commercialRegistrationNumber?: string
  taxIdentificationNumber?: string
  taxNumber?: string
  valueAddedTaxNumber?: string

  // Financial Fields
  currencyRef?: string
  currency?: CatalogEntry

  // Media Fields
  picture?: Record<string, any>
  pictureThumbnail?: string

  // Additional Data
  additionalProperties?: Record<string, any>

  // Relationships
  companyEmployee?: CompanyEmployee[]
  organizationalUnits?: OrganizationalUnit[]
  addresses?: CompanyAddress[]
  parentRelationships?: CompanyRelationship[]
  childRelationships?: CompanyRelationship[]
  documents?: CompanyDocument[]
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
 * ALL fields available in GraphQL schema (BaseEntity fields NOT included - handled by BASE_ENTITY_DESCRIPTORS)
 */
export const CompanyFields = {
  // Core Fields
  code: 'code',
  name: 'name',
  description: 'description',
  structureId: 'structureId',

  // Legal/Tax Fields
  directorId: 'directorId',
  director: 'director',
  commercialRegistrationNumber: 'commercialRegistrationNumber',
  taxIdentificationNumber: 'taxIdentificationNumber',
  taxNumber: 'taxNumber',
  valueAddedTaxNumber: 'valueAddedTaxNumber',

  // Financial Fields
  currencyRef: 'currencyRef',
  currency: 'currency',

  // Media Fields
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',

  // Additional Data
  additionalProperties: 'additionalProperties',

  // Relationships
  companyEmployee: 'companyEmployee',
  organizationalUnits: 'organizationalUnits',
  addresses: 'addresses',
  parentRelationships: 'parentRelationships',
  childRelationships: 'childRelationships',
  documents: 'documents'
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

  // Core Fields
  code: 'code',
  name: 'name',
  description: 'description',
  structureId: 'structureId',

  // Legal/Tax Fields
  directorId: 'director',
  commercialRegistrationNumber: 'commercialRegistrationNumber',
  taxIdentificationNumber: 'taxIdentificationNumber',
  taxNumber: 'taxNumber',
  valueAddedTaxNumber: 'valueAddedTaxNumber',

  // Financial Fields
  currencyRef: 'currencyRef'
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

  // Core Fields
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  { key: 'structureId', searchPaths: [fields.structureId], sortPath: fields.structureId, type: 'text' },

  // Legal/Tax Fields
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

  // Entity References
  {
    key: 'director',
    searchPaths: [`${fields.director}.displayName`, `${fields.director}.firstName`, `${fields.director}.lastName`],
    sortPath: `${fields.director}.displayName`,
    type: 'text'
  },

  // Filter IDs
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
