/**
 * Query helper utilities for Lead views
 */

/**
 * Type for custom filter mapping functions
 */
export type FilterApplier = <T extends Record<string, any>>(vars: T, selectedFilters: Record<string, any>) => void

/**
 * Create a generic lead filter applier with custom mappings
 * @param customMappings - Custom filter ID to applier function mappings
 * @returns Filter applier function
 */
export const createLeadFilterApplier = (
  customMappings?: Record<string, (vars: any, value: any) => void>
): FilterApplier => {
  return (vars, selectedFilters) => {
    // Default filter mappings
    const defaultMappings: Record<string, (vars: any, value: any) => void> = {
      // Multi-select filters (IDs)
      leadStatuses: (v, value) => Array.isArray(value) && value.length && (v.leadStatusIds = value),
      leadRatings: (v, value) => Array.isArray(value) && value.length && (v.leadRatingIds = value),
      leadSources: (v, value) => Array.isArray(value) && value.length && (v.leadSourceIds = value),
      owners: (v, value) => Array.isArray(value) && value.length && (v.ownerEmployeeIds = value),

      // Geography filters
      countries: (v, value) => Array.isArray(value) && value.length && (v.countryIds = value),
      regions: (v, value) => Array.isArray(value) && value.length && (v.regionIds = value),
      cities: (v, value) => Array.isArray(value) && value.length && (v.cities = value),

      // Boolean filters
      sensitive: (v, value) => {
        if (Array.isArray(value) && value.length > 0) {
          const sensitiveValue = value[0]
          if (sensitiveValue === 'true') {
            v.sensitive = true
          } else if (sensitiveValue === 'false') {
            v.sensitive = false
          }
        }
      },

      // Date filters (using After/Before naming to match GraphQL descriptors)
      createdAfter: (v, value) => value && (v.createdAfter = value),
      createdBefore: (v, value) => value && (v.createdBefore = value)
    }

    // Merge with custom mappings (custom overrides defaults)
    const allMappings = { ...defaultMappings, ...customMappings }

    // Apply all filters
    Object.entries(selectedFilters).forEach(([key, value]) => {
      const applier = allMappings[key]
      if (applier) {
        applier(vars, value)
      }
    })
  }
}

/**
 * Default lead filter applier
 * Can be used directly or extended with custom mappings
 */
export const applyLeadFilters = createLeadFilterApplier()
