import type { FilterConfiguration } from '@newwork/nw-design-system'

// Infer types from FilterConfiguration
type FilterGroup = NonNullable<FilterConfiguration['groups']>[number]
type Filter = FilterGroup['filters'][number]

/**
 * Maps catalog field type to filter type.
 * Returns null for CATALOG_* and REF_* types — these require inIds-style handling
 * which is already covered by the static INVESTMENT_REPORT_DESCRIPTORS.
 */
const getFilterTypeFromCatalogType = (catalogType: string): Filter['type'] | null => {
  if (catalogType === 'AMOUNT' || catalogType === 'NUMBER') return 'number'
  if (catalogType === 'PERCENTAGE') return 'number'
  if (catalogType === 'DATE' || catalogType === 'DATETIME') return 'date'
  if (catalogType === 'TEXT' || catalogType === 'TEXTAREA') return 'text'
  if (catalogType.startsWith('CATALOG_') || catalogType.startsWith('REF_')) return null

  // Default to text for unknown types
  return 'text'
}

/**
 * Generates filter configuration from catalog field
 */
const generateFilterConfig = (field: any, entityPrefix: string): Filter | null => {
  const filterType = getFilterTypeFromCatalogType(field.type)

  // Skip catalog/ref types — handled separately via inIds descriptors
  if (filterType === null) return null

  // Parse property path to generate filter ID
  // Examples:
  // - 'investment.loanAmount' -> 'loanAmount'
  // - 'equityInvestment.marketValue' -> 'equityMarketValue'
  // - 'realEstateInvestment.size' -> 'realEstateSize'
  const parts = field.property.split('.')
  if (parts.length < 2) return null

  const entity = parts[0]
  const fieldName = parts.slice(1).join('.')

  let filterId: string
  if (entity === 'investment') {
    // Common field - use field name as-is
    filterId = fieldName
  } else if (entity === 'equityInvestment' || entity === 'realEstateInvestment' || entity === 'liquidFundInvestment') {
    // Type-specific field - add prefix
    filterId = `${entityPrefix}${fieldName.charAt(0).toUpperCase()}${fieldName.slice(1)}`
  } else {
    // Unknown entity, use full path
    filterId = field.property.replace('.', '_')
  }

  // Generate filter config based on type
  const baseFilter: Filter = {
    id: filterId,
    field: filterId,
    label: field.label,
    type: filterType,
    config: {}
  }

  // Add type-specific configuration
  if (filterType === 'number') {
    baseFilter.config = {
      mode: 'range',
      placeholderMin: field.type === 'PERCENTAGE' ? 'Min %' : 'Min',
      placeholderMax: field.type === 'PERCENTAGE' ? 'Max %' : 'Max'
    }

    // Only set min/max for percentages (bounded 0-100)
    if (field.type === 'PERCENTAGE') {
      baseFilter.config.min = 0
      baseFilter.config.max = 100
    }
    // For AMOUNT fields, leave min/max undefined so text inputs are used instead of sliders
  } else if (filterType === 'date') {
    baseFilter.config = {
      mode: 'range'
    }
  } else if (filterType === 'text') {
    baseFilter.config = {
      placeholder: `Search ${field.label}...`
    }
  } else if (filterType === 'multi-select') {
    baseFilter.config = {
      options: [],
      searchPlaceholder: `Search ${field.label.toLowerCase()}...`,
      totalCount: 0,
      hasMore: false
    }
  }

  return baseFilter
}

/**
 * Generates FilterConfiguration from catalog formFields
 *
 * @param catalogFormFields - Array of form field groups from catalog
 * @param entityPrefix - Prefix for type-specific fields ('equity', 'realEstate', 'liquidFund')
 * @param configId - Unique ID for the filter configuration
 * @param configName - Display name for the filter configuration
 * @returns FilterConfiguration with dynamically generated filter groups
 */
export const generateFiltersFromCatalog = (
  catalogFormFields: any[] | undefined,
  entityPrefix: string,
  configId: string,
  configName: string
): FilterConfiguration => {
  if (!catalogFormFields || catalogFormFields.length === 0) {
    return {
      id: configId,
      name: configName,
      groups: []
    }
  }

  const filterGroups: FilterGroup[] = []

  // Process each form field group from catalog
  catalogFormFields.forEach((group: any) => {
    // Process each field in the group
    group.fields?.forEach((field: any) => {
      // Skip fields marked with report: false (matches column generation logic)
      if (field.report === false) {
        return
      }

      // Generate filter config for this field
      const filterConfig = generateFilterConfig(field, entityPrefix)
      if (filterConfig) {
        // Create a separate group for each filter
        filterGroups.push({
          id: `${filterConfig.id}-group`,
          label: filterConfig.label,
          collapsible: true,
          defaultExpanded: false,
          filters: [filterConfig]
        })
      }
    })
  })

  return {
    id: configId,
    name: configName,
    groups: filterGroups
  }
}
