/**
 * Query helper utilities for Task views
 */

/**
 * Type for custom filter mapping functions
 */
export type FilterApplier = <T extends Record<string, any>>(vars: T, selectedFilters: Record<string, any>) => void

/**
 * Create a generic filter applier with custom mappings
 * @param customMappings - Custom filter ID to applier function mappings
 * @returns Filter applier function
 */
export const createTaskFilterApplier = (
  customMappings?: Record<string, (vars: any, value: any) => void>
): FilterApplier => {
  return (vars, selectedFilters) => {
    // Default filter mappings
    const defaultMappings: Record<string, (vars: any, value: any) => void> = {
      // Multi-select filters (IDs)
      status: (v, value) => Array.isArray(value) && value.length && (v.taskStatusIds = value),
      priority: (v, value) => Array.isArray(value) && value.length && (v.taskPriorityIds = value),
      type: (v, value) => Array.isArray(value) && value.length && (v.taskTypeIds = value),
      referenceType: (v, value) => Array.isArray(value) && value.length && (v.referenceTypes = value),

      // Date range filters (using From/To naming to match GraphQL descriptors)
      // Handle both string format "YYYY-MM-DD,YYYY-MM-DD" and array format
      createdDateRange: (v, value) => {
        if (value) {
          const dates = typeof value === 'string' ? value.split(',') : value
          if (Array.isArray(dates) && dates.length >= 2) {
            const [start, end] = dates
            if (start) v.createdAtFrom = start.trim()
            if (end) v.createdAtTo = end.trim()
          }
        }
      },
      dueDateRange: (v, value) => {
        if (value) {
          const dates = typeof value === 'string' ? value.split(',') : value
          if (Array.isArray(dates) && dates.length >= 2) {
            const [start, end] = dates
            if (start) v.dueDateFrom = start.trim()
            if (end) v.dueDateTo = end.trim()
          }
        }
      }
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
 * Default task filter applier
 * Can be used directly or extended with custom mappings
 */
export const applyTaskFilters = createTaskFilterApplier()

/**
 * @deprecated Use applyTaskFilters instead
 */
export const applyBasicFilters = <T extends Record<string, any>>(
  vars: T,
  selectedFilters: Record<string, any>
): void => {
  // Status filter - use correct field names for both Customer and Investment
  if (selectedFilters.status && Array.isArray(selectedFilters.status) && selectedFilters.status.length > 0) {
    vars.taskStatusIds = selectedFilters.status
  }

  // Priority filter
  if (selectedFilters.priority && Array.isArray(selectedFilters.priority) && selectedFilters.priority.length > 0) {
    vars.taskPriorityIds = selectedFilters.priority
  }

  // Type filter
  if (selectedFilters.type && Array.isArray(selectedFilters.type) && selectedFilters.type.length > 0) {
    vars.taskTypeIds = selectedFilters.type
  }

  // Reference Type filter
  if (
    selectedFilters.referenceType &&
    Array.isArray(selectedFilters.referenceType) &&
    selectedFilters.referenceType.length > 0
  ) {
    vars.referenceTypes = selectedFilters.referenceType
  }
}

/**
 * @deprecated Use applyTaskFilters instead
 */
export const applyDateFilter = <T extends Record<string, any>>(vars: T, selectedFilters: Record<string, any>): void => {
  // Handle Created Date Range filter (date range picker)
  if (selectedFilters.createdDateRange && Array.isArray(selectedFilters.createdDateRange)) {
    const [startDate, endDate] = selectedFilters.createdDateRange
    if (startDate) {
      vars.createdAfter = startDate
    }
    if (endDate) {
      vars.createdBefore = endDate
    }
  }

  // Handle Due Date Range filter (date range picker)
  if (selectedFilters.dueDateRange && Array.isArray(selectedFilters.dueDateRange)) {
    const [startDate, endDate] = selectedFilters.dueDateRange
    if (startDate) {
      vars.dueDateAfter = startDate
    }
    if (endDate) {
      vars.dueDateBefore = endDate
    }
  }

  // Fallback: Support old individual date fields (if still used somewhere)
  if (selectedFilters.createdAfter) {
    vars.createdAfter = selectedFilters.createdAfter
  }
  if (selectedFilters.createdBefore) {
    vars.createdBefore = selectedFilters.createdBefore
  }
  if (selectedFilters.dueDateAfter) {
    vars.dueDateAfter = selectedFilters.dueDateAfter
  }
  if (selectedFilters.dueDateBefore) {
    vars.dueDateBefore = selectedFilters.dueDateBefore
  }
}
