/**
 * Catalog metadata retrieved from GraphQL
 */
export interface CatalogMetadata {
  catalogIdentifier: string
  displayName: string
  version: string
  description?: string
  totalCount?: number
  fields: CatalogField[]
  sampleEntries?: CatalogSampleEntry[]
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
  preview?: string
}

/**
 * Full catalog entry with all data
 */
export interface CatalogEntry {
  id: string
  displayName: string
  data: Record<string, any>
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
