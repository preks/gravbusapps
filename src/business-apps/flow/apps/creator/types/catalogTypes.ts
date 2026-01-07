/**
 * Catalog metadata retrieved from GraphQL
 */
export interface CatalogMetadata {
  catalogIdentifier: string
  displayName: string
  version: string
  description?: string
  totalCount?: number // Total number of entries in this catalog
  fields: CatalogField[]
  sampleEntries?: CatalogSampleEntry[] // First few entries for preview
}

/**
 * Catalog field definition
 */
export interface CatalogField {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
}

/**
 * Sample catalog entry for preview
 */
export interface CatalogSampleEntry {
  id: string
  displayName: string
  preview?: string // Short preview text
}

/**
 * Full catalog entry with all data
 */
export interface CatalogEntry {
  id: string
  displayName: string
  data: Record<string, any> // Full entry data
}

/**
 * Response from catalog entries query
 */
export interface CatalogEntriesResponse {
  entries: CatalogEntry[]
  totalCount: number
  hasMore: boolean
}

/**
 * Response from catalog discovery query
 */
export interface CatalogDiscoveryResponse {
  catalogs: CatalogMetadata[]
}
