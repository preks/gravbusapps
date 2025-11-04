/**
 * Query helper utilities for Customer Lead views
 */

/**
 * Apply basic filter fields to query variables
 */
export const applyBasicFilters = <T extends Record<string, any>>(
  vars: T,
  selectedFilters: Record<string, any>
): void => {
  // Lead Status filter
  if (
    selectedFilters.leadStatuses &&
    Array.isArray(selectedFilters.leadStatuses) &&
    selectedFilters.leadStatuses.length > 0
  ) {
    vars.leadStatusIds = selectedFilters.leadStatuses
  }

  // Lead Rating filter
  if (
    selectedFilters.leadRatings &&
    Array.isArray(selectedFilters.leadRatings) &&
    selectedFilters.leadRatings.length > 0
  ) {
    vars.leadRatingIds = selectedFilters.leadRatings
  }

  // Lead Source filter
  if (
    selectedFilters.leadSources &&
    Array.isArray(selectedFilters.leadSources) &&
    selectedFilters.leadSources.length > 0
  ) {
    vars.leadSourceIds = selectedFilters.leadSources
  }

  // Owner filter
  if (selectedFilters.owners && Array.isArray(selectedFilters.owners) && selectedFilters.owners.length > 0) {
    vars.ownerEmployeeIds = selectedFilters.owners
  }

  // Geography filters
  if (selectedFilters.countries && Array.isArray(selectedFilters.countries) && selectedFilters.countries.length > 0) {
    vars.countryIds = selectedFilters.countries
  }

  if (selectedFilters.regions && Array.isArray(selectedFilters.regions) && selectedFilters.regions.length > 0) {
    vars.regionIds = selectedFilters.regions
  }

  if (selectedFilters.cities && Array.isArray(selectedFilters.cities) && selectedFilters.cities.length > 0) {
    vars.cities = selectedFilters.cities
  }

  // Sensitive data filter
  if (selectedFilters.sensitive && Array.isArray(selectedFilters.sensitive) && selectedFilters.sensitive.length > 0) {
    const sensitiveValue = selectedFilters.sensitive[0]
    if (sensitiveValue === 'true') {
      vars.sensitive = true
    } else if (sensitiveValue === 'false') {
      vars.sensitive = false
    }
  }
}

/**
 * Apply date range filters to query variables
 */
export const applyDateFilter = <T extends Record<string, any>>(vars: T, selectedFilters: Record<string, any>): void => {
  if (selectedFilters.createdAfter) {
    vars.createdAfter = selectedFilters.createdAfter
  }

  if (selectedFilters.createdBefore) {
    vars.createdBefore = selectedFilters.createdBefore
  }
}
