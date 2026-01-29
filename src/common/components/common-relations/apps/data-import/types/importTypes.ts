/**
 * Shared types for import functionality across all entities
 */

import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

// Field mapping between source CSV and target entity
export interface FieldMapping {
  sourceField: string
  targetField: string
  transformationType: 'direct' | 'catalog'
  catalogIdentifier?: string
}

// AI analyzer response structure
export interface ImportAnalyzerResponse {
  fieldMappings: FieldMapping[]
  sourceFields: string[]
  unmappedSourceFields: string[]
}

// Generic parsed row from CSV
export interface ParsedRow {
  [key: string]: string
}

// Communication channel structure for contacts/accounts
export interface CommunicationChannel {
  communicationChannelRef: string
  value: string
  valueExtension?: string
}

// Generic converted entity (can have any fields)
// NOTE: Supports arrays (e.g., communicationChannels) and objects for complex field transformations
export interface ConvertedEntity {
  [key: string]: string | boolean | number | null | CommunicationChannel[] | Record<string, unknown>
  communicationChannels?: CommunicationChannel[]
}

// Catalog lookup cache for performance
export interface CatalogLookupCache {
  [catalogIdentifier: string]: {
    [searchValue: string]: string | null
  }
}

// Import configuration for an entity
export interface ImportConfig {
  entityType: string
  domain: 'customer' | 'investment' // Domain for endpoint routing
  aiAgentName: string
  targetFields: TargetFieldDefinition[]
  requiredCatalogs: string[]
}

// Target field definition
export interface TargetFieldDefinition {
  value: string
  label: string
  type: 'direct' | 'catalog'
  catalog?: string
  required?: boolean
}

// Import result after API call
export interface ImportResult {
  success: boolean
  successCount: number
  errorCount: number
  errors?: ImportError[]
  createdIds?: string[]
}

// Import error details
export interface ImportError {
  rowIndex: number
  entityData: ConvertedEntity
  error: string
}

// Import step types
export type ImportStep = 'upload' | 'mapping' | 'result'

// Catalog data structure for lookup
export interface CatalogData {
  [catalogKey: string]: CatalogEntry[]
}
