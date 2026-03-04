import { CustomDataGraphQLClient } from './CustomDataGraphQLClient'

export interface FieldMappingSuggestion {
  requestedField: string
  suggestedField: string | null
  confidence: 'exact' | 'fuzzy' | 'none'
  allAvailableFields: string[]
}

/**
 * Resolves field name mismatches between AI-generated GraphQL queries and actual schema.
 * Uses schema introspection to suggest correct field names.
 */
export class FieldNameResolver {
  constructor(private readonly graphqlClient: CustomDataGraphQLClient) {}

  /**
   * Get correct field names from schema for a given entity type.
   * Returns a mapping of normalized names to actual schema field names.
   */
  async getFieldMapping(entityKey: string): Promise<Map<string, string>> {
    const schemaTypes = await this.graphqlClient.introspectEntityType(entityKey)
    const mapping = new Map<string, string>()

    // Create normalized-to-actual mapping
    Object.keys(schemaTypes).forEach(actualFieldName => {
      const normalized = this.normalizeFieldName(actualFieldName)
      mapping.set(normalized, actualFieldName)
      // Also store the actual name as-is
      mapping.set(actualFieldName, actualFieldName)
    })

    return mapping
  }

  /**
   * Suggest correct field name based on schema.
   */
  async suggestFieldName(entityKey: string, requestedField: string): Promise<FieldMappingSuggestion> {
    const schemaTypes = await this.graphqlClient.introspectEntityType(entityKey)
    const availableFields = Object.keys(schemaTypes)

    // Exact match (case-insensitive)
    const exactMatch = availableFields.find(f => f.toLowerCase() === requestedField.toLowerCase())

    if (exactMatch) {
      return {
        requestedField,
        suggestedField: exactMatch,
        confidence: 'exact',
        allAvailableFields: availableFields
      }
    }

    // Fuzzy match after normalization
    const normalizedRequested = this.normalizeFieldName(requestedField)
    const fuzzyMatch = availableFields.find(f => this.normalizeFieldName(f) === normalizedRequested)

    if (fuzzyMatch) {
      return {
        requestedField,
        suggestedField: fuzzyMatch,
        confidence: 'fuzzy',
        allAvailableFields: availableFields
      }
    }

    // No match
    return {
      requestedField,
      suggestedField: null,
      confidence: 'none',
      allAvailableFields: availableFields
    }
  }

  private normalizeFieldName(name: string): string {
    // Split on separators first to avoid backtracking vulnerabilities
    const parts = name.split(/[_\-\s]+/)
    return parts
      .map((part, index) => {
        // Remove non-alphanumeric chars from each part
        const cleaned = part.replace(/[^a-zA-Z0-9]/g, '')
        if (!cleaned) return ''
        // First part starts lowercase, rest start uppercase
        if (index === 0) {
          return cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
        }
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
      })
      .join('')
  }
}
