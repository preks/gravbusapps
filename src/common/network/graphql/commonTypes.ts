/**
 * Basic GraphQL types for query building
 */

import type { Descriptor } from './queryHelpers'

// ==========================================
// QUERY INTERFACES
// ==========================================

export interface BaseQueryVariables {
  id?: string
  search?: string
  offset?: number
  limit?: number
  orderBy?: any[]
  where?: any
  structureId?: string
}

export interface QueryOptions {
  includeDeleted?: boolean
  useCurrentStructure?: boolean
  recordState?: string
  activeOnly?: boolean
}

// ==========================================
// RESPONSE INTERFACES
// ==========================================

export interface QueryResponse<T> {
  data: T[]
  aggregate?: {
    count: number
  }
}

// ==========================================
// PAGINATION
// ==========================================

export interface PaginationInfo {
  offset: number
  limit: number
  total: number
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

// ==========================================
// ENTITY INTERFACES
// ==========================================

export interface BaseEntity {
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  isDeleted: boolean
  recordState?: string
  activeFrom?: string
  activeTo?: string
  version: number
  additionalProperties?: any // jsonb
}

/**
 * Base Entity Descriptors
 * Common descriptors for all entities extending BaseEntity
 * Keys match BaseEntity fields exactly (alphabetically sorted)
 */
export const BASE_ENTITY_DESCRIPTORS: Descriptor[] = [
  { key: 'activeFrom', searchPaths: ['activeFrom'], sortPath: 'activeFrom', type: 'date' },
  { key: 'activeTo', searchPaths: ['activeTo'], sortPath: 'activeTo', type: 'date' },
  {
    key: 'additionalProperties',
    sortPath: 'additionalProperties',
    type: 'text',
    enableSort: false,
    enableFilter: false
  },
  { key: 'createdAt', searchPaths: ['createdAt'], sortPath: 'createdAt', type: 'date' },
  { key: 'createdBy', type: 'text' },
  { key: 'isDeleted', searchPaths: ['isDeleted'], sortPath: 'isDeleted', type: 'boolean' },
  { key: 'recordState', searchPaths: ['recordState'], sortPath: 'recordState', type: 'text' },
  { key: 'updatedAt', searchPaths: ['updatedAt'], sortPath: 'updatedAt', type: 'date' },
  { key: 'updatedBy', type: 'text' },
  { key: 'version', searchPaths: ['version'], sortPath: 'version', type: 'number' },

  // Date range filters
  { key: 'activeFromAfter', path: 'activeFrom', kind: 'dateFrom' },
  { key: 'activeFromBefore', path: 'activeFrom', kind: 'dateTo' },
  { key: 'activeToAfter', path: 'activeTo', kind: 'dateFrom' },
  { key: 'activeToBefore', path: 'activeTo', kind: 'dateTo' },
  { key: 'createdAfter', path: 'createdAt', kind: 'dateFrom' },
  { key: 'createdBefore', path: 'createdAt', kind: 'dateTo' },
  { key: 'updatedAfter', path: 'updatedAt', kind: 'dateFrom' },
  { key: 'updatedBefore', path: 'updatedAt', kind: 'dateTo' }
]

// ==========================================
// CATALOG ENTRY TYPES
// ==========================================

export interface CatalogEntry {
  id: string
  code: string
  alternativeCode?: string
  value?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  type?: string
  objectValue?: any
  catalogId?: string
  parentEntryId?: string
  displayOrder?: number
  translations?: CatalogEntryTranslation[]
}

export interface CatalogEntryTranslation {
  id: string
  localeCode: string
  value: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  objectValue?: any
}
