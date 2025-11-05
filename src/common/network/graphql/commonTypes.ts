/**
 * Basic GraphQL types for query building
 */

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

export interface FinancialQueryResponse<T> extends QueryResponse<T> {
  aggregate?: {
    count: number
    sum?: {
      [key: string]: number
    }
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

// Note: activeFrom/activeTo are now included in AuditFields
// Extended validity periods can be added to specific entities if needed:
// effectiveFrom?: string;
// effectiveTo?: string;

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
