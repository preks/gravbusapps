/**
 * Query helper utilities for Campaign views
 */

/**
 * Apply basic filter fields to query variables
 */
export const applyBasicFilters = <T extends Record<string, any>>(
  vars: T,
  selectedFilters: Record<string, any>
): void => {
  // Campaign Type filter
  if (selectedFilters.types && Array.isArray(selectedFilters.types) && selectedFilters.types.length > 0) {
    vars.campaignTypes = selectedFilters.types
  }

  // Status filter (computed from dates - handled in query)
  if (selectedFilters.status && Array.isArray(selectedFilters.status) && selectedFilters.status.length > 0) {
    vars.statusFilter = selectedFilters.status
  }
}

/**
 * Apply date range filters to query variables
 */
export const applyDateFilter = <T extends Record<string, any>>(vars: T, selectedFilters: Record<string, any>): void => {
  if (selectedFilters.startDateAfter) {
    vars.startDateAfter = selectedFilters.startDateAfter
  }

  if (selectedFilters.startDateBefore) {
    vars.startDateBefore = selectedFilters.startDateBefore
  }

  if (selectedFilters.endDateAfter) {
    vars.endDateAfter = selectedFilters.endDateAfter
  }

  if (selectedFilters.endDateBefore) {
    vars.endDateBefore = selectedFilters.endDateBefore
  }

  if (selectedFilters.createdAfter) {
    vars.createdAfter = selectedFilters.createdAfter
  }

  if (selectedFilters.createdBefore) {
    vars.createdBefore = selectedFilters.createdBefore
  }
}
