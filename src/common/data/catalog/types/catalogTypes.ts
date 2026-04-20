/**
 * Catalog Data Types for GraphQL API
 * Following the investment data pattern with Base types and enhanced types
 */

// Base audit fields interface
export interface AuditFields {
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}

// =====================================================
// BASE CATALOG TYPES (Raw GraphQL Data)
// =====================================================

// Catalog entry translation interface for GraphQL fields (raw data from API)
export interface CatalogEntryTranslation extends AuditFields {
  id: string
  localeCode: string
  value: string
  additionalValue1: string
  additionalValue2: string
  additionalValue3: string
  objectValue?: any // jsonb
  catalogEntryId: string
}

// Base catalog interface with GraphQL fields (raw data from API)
export interface BaseCatalog extends AuditFields {
  id: string
  identifier: string
  name: string
  description?: string
  defaultLocale?: string
  schemaDefinition?: any // jsonb
  parentId?: string
  isDeleted?: boolean
  recordState?: string
  validFrom?: string
  validTo?: string
  isCustomerManaged?: boolean

  // Legacy compatibility fields
  version?: string // For compatibility with REST API expectations

  // Relationships
  parentCatalog?: BaseCatalog
  catalogEntries?: BaseCatalogEntry[]
  catalogs?: BaseCatalog[] // Child catalogs

  // Aggregated data
  catalogEntriesAggregate?: {
    aggregate?: {
      count: number
    }
  }
}

// Base catalog entry interface with GraphQL fields (raw data from API)
export interface BaseCatalogEntry extends AuditFields {
  id: string
  code?: string
  value?: string // Main display value
  alternativeCode?: string
  description?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  type?: string
  displayOrder?: number
  objectValue?: any // jsonb

  // Translation fields for translatable content
  valueTranslations?: Record<string, string>
  descriptionTranslations?: Record<string, string>
  additionalValue1Translations?: Record<string, string>
  additionalValue2Translations?: Record<string, string>
  additionalValue3Translations?: Record<string, string>

  // Timestamps
  activeFrom?: string
  activeTo?: string

  // Relationships
  catalogId: string
  catalog?: BaseCatalog
  parentEntryId?: string
  parentEntry?: BaseCatalogEntry
  childEntries?: BaseCatalogEntry[]

  // Translations
  translations?: CatalogEntryTranslation[]

  // State fields
  isDeleted?: boolean
  recordState?: string
}

// =====================================================
// ENHANCED CATALOG TYPES (With Computed Fields)
// =====================================================

// Enhanced catalog interface for UI display with computed fields
export interface Catalog extends BaseCatalog {
  // Computed display fields only DONT USE THESE FIELDS FOR NOW
  displayName: string
  entriesCount: number
  hasChildCatalogs: boolean
  lastUpdated: string
  status: 'active' | 'inactive' | 'draft'
  color?: string // For UI styling
  // Enhanced entries and UI state for pagination/search YOU CAN USE THESE FIELDS
  entries?: CatalogEntry[]
  total?: number
  offset?: number
  limit?: number
  loading?: boolean
  search?: string
}

// Enhanced catalog entry interface for UI display with computed fields
export interface CatalogEntry extends BaseCatalogEntry {
  // Computed display fields only DONT USE THESE FIELDS FOR NOW
  displayValue: string // Formatted display value (code or description)
  fullPath?: string // Full hierarchical path
  hasChildren: boolean
  level: number // Hierarchy level (0 = root)
  parentPath?: string
  searchableText: string // Combined searchable content
  // Mapped child entries (optional tree mapping)
  childEntries?: CatalogEntry[]
  // Fields for UI state and pagination/search  YOU CAN USE THESE FIELDS
  total?: number
  offset?: number
  limit?: number
  loading?: boolean
  search?: string
}

// =====================================================
// QUERY VARIABLE INTERFACES
// =====================================================

// Query variable interfaces
export interface CatalogQueryVariables {
  limit?: number
  offset?: number
  search?: string
  includeDeleted?: boolean
  parentId?: string
  catalogIdentifiers?: string[] // For fetching specific catalogs by identifier:version
  orderBy?: Array<{
    field: string
    direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC_NULLS_FIRST' | 'DESC_NULLS_FIRST'
  }>
}

// Conditional include options for REST-like API behavior
export interface CatalogIncludeOptions {
  includeCatalogEntries?: boolean
  includeParentCatalogEntry?: boolean
  includeChildCatalogEntries?: boolean
}

// Combined query options
export interface CatalogQueryOptions extends CatalogQueryVariables, CatalogIncludeOptions {
  // Uniform nested entries pagination for all returned catalogs (used by initial batched GET_CATALOGS)
  entriesLimit?: number
  entriesOffset?: number
}

export interface CatalogEntryQueryVariables {
  catalogId?: string
  catalogIdentifier?: string
  version?: string // catalog version (defaults to 'v1')
  limit?: number
  offset?: number
  search?: string
  includeDeleted?: boolean
  parentEntryId?: string
  includeChildEntries?: boolean
  // Additional precise filters
  entryId?: string | string[] // fetch one or multiple entries by id
  typeEquals?: string // filter by exact type equality
  excludeCodes?: string[] // Exclude entries with codes matching these patterns (case-insensitive substring)
  includeCodes?: string[] // Include only entries with codes matching these patterns (case-insensitive substring)
  excludeTypes?: string[] // Exclude entries with types matching these patterns (case-insensitive substring)
  includeTypes?: string[] // Include only entries with types matching these patterns (case-insensitive substring)
  orderBy?: Array<{
    field: string
    direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC_NULLS_FIRST' | 'DESC_NULLS_FIRST'
  }>
}

// =====================================================
// RESPONSE INTERFACES FOR GRAPHQL QUERIES
// =====================================================

export interface CatalogResponse {
  Catalog: BaseCatalog[]
  CatalogAggregate?: {
    aggregate?: {
      count: number
    }
  }
}

export interface CatalogEntryResponse {
  CatalogEntry: BaseCatalogEntry[]
  CatalogEntryAggregate?: {
    aggregate?: {
      count: number
    }
  }
}

export interface SingleCatalogResponse {
  Catalog: BaseCatalog[]
}

export interface SingleCatalogEntryResponse {
  CatalogEntry: BaseCatalogEntry[]
}

// =====================================================
// FILTER AND SORT OPTIONS
// =====================================================

export interface CatalogFilters {
  search?: string
  hasEntries?: boolean
  parentId?: string
  status?: 'active' | 'inactive' | 'all'
}

export interface CatalogEntryFilters {
  search?: string
  hasChildren?: boolean
  parentEntryId?: string
  activeOnly?: boolean
  level?: number
}

// =====================================================
// LIST RESULT INTERFACES
// =====================================================

export interface CatalogList {
  items: Catalog[]
  total: number
  limit: number
  offset: number
  page: number
  search?: string
  loading: boolean
}
