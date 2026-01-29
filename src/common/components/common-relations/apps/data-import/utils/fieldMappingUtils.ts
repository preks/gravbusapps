/**
 * Field mapping utilities
 * Extracted from LeadImportExample lines 346-365
 */

import {
  FieldMapping,
  ParsedRow,
  ConvertedEntity,
  CatalogLookupCache
} from '@/common/components/common-relations/apps/data-import/types'

/**
 * Apply field mappings to convert a parsed row to an entity
 */
export function applyFieldMappings(
  row: ParsedRow,
  mappings: FieldMapping[],
  catalogCache: CatalogLookupCache,
  lookupCatalogFn: (catalogIdentifier: string, searchValue: string) => string | null
): ConvertedEntity {
  const entity: ConvertedEntity = {}

  mappings.forEach(mapping => {
    const sourceValue = row[mapping.sourceField]

    if (mapping.transformationType === 'direct') {
      entity[mapping.targetField] = sourceValue || null
    } else if (mapping.transformationType === 'catalog' && mapping.catalogIdentifier) {
      // Use cache for performance
      if (!catalogCache[mapping.catalogIdentifier]) {
        catalogCache[mapping.catalogIdentifier] = {}
      }

      if (sourceValue in catalogCache[mapping.catalogIdentifier]) {
        entity[mapping.targetField] = catalogCache[mapping.catalogIdentifier][sourceValue]
      } else {
        const catalogId = lookupCatalogFn(mapping.catalogIdentifier, sourceValue)
        catalogCache[mapping.catalogIdentifier][sourceValue] = catalogId
        entity[mapping.targetField] = catalogId
      }
    }
  })

  return entity
}

/**
 * Convert all parsed rows to entities
 */
export function convertParsedDataToEntities(
  parsedData: ParsedRow[],
  mappings: FieldMapping[],
  lookupCatalogFn: (catalogIdentifier: string, searchValue: string) => string | null
): ConvertedEntity[] {
  const catalogCache: CatalogLookupCache = {}

  return parsedData.map(row => applyFieldMappings(row, mappings, catalogCache, lookupCatalogFn))
}

/**
 * Validate field mapping configuration
 */
export function validateFieldMappings(mappings: FieldMapping[]): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (mappings.length === 0) {
    errors.push('At least one field mapping is required')
  }

  // Check for duplicate target fields
  const targetFields = mappings.map(m => m.targetField)
  const duplicates = targetFields.filter((field, index) => targetFields.indexOf(field) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate target fields: ${duplicates.join(', ')}`)
  }

  // Check catalog mappings have catalog identifier
  const catalogMappings = mappings.filter(m => m.transformationType === 'catalog')
  const missingCatalog = catalogMappings.filter(m => !m.catalogIdentifier)
  if (missingCatalog.length > 0) {
    errors.push(`Catalog mappings missing catalog identifier: ${missingCatalog.map(m => m.targetField).join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get unmapped source fields
 */
export function getUnmappedFields(sourceFields: string[], mappings: FieldMapping[]): string[] {
  const mappedSources = new Set(mappings.map(m => m.sourceField))
  return sourceFields.filter(field => !mappedSources.has(field))
}
