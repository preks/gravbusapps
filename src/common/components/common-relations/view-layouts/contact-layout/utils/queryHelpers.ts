/**
 * Query helper utilities for Contact views
 */

/**
 * Apply basic filter fields to query variables
 */
export const applyBasicFilters = <T extends Record<string, any>>(
  vars: T,
  selectedFilters: Record<string, any>
): void => {
  // Owner filter
  if (selectedFilters.owners && Array.isArray(selectedFilters.owners) && selectedFilters.owners.length > 0) {
    vars.ownerEmployeeIds = selectedFilters.owners
  }

  // Contact Type filter
  if (
    selectedFilters.contactTypes &&
    Array.isArray(selectedFilters.contactTypes) &&
    selectedFilters.contactTypes.length > 0
  ) {
    vars.contactTypes = selectedFilters.contactTypes
  }

  // Account filter
  if (selectedFilters.accounts && Array.isArray(selectedFilters.accounts) && selectedFilters.accounts.length > 0) {
    vars.accountIds = selectedFilters.accounts
  }

  // Gender filter
  if (selectedFilters.genders && Array.isArray(selectedFilters.genders) && selectedFilters.genders.length > 0) {
    vars.genderIds = selectedFilters.genders
  }

  // Academic Title filter
  if (
    selectedFilters.academicTitles &&
    Array.isArray(selectedFilters.academicTitles) &&
    selectedFilters.academicTitles.length > 0
  ) {
    vars.academicTitleIds = selectedFilters.academicTitles
  }

  // Professional Title filter
  if (
    selectedFilters.professionalTitles &&
    Array.isArray(selectedFilters.professionalTitles) &&
    selectedFilters.professionalTitles.length > 0
  ) {
    vars.professionalTitleIds = selectedFilters.professionalTitles
  }

  // Department filter
  if (
    selectedFilters.departments &&
    Array.isArray(selectedFilters.departments) &&
    selectedFilters.departments.length > 0
  ) {
    vars.departments = selectedFilters.departments
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

  // Contact info filters (has/missing email, phone)
  if (
    selectedFilters.contactInfo &&
    Array.isArray(selectedFilters.contactInfo) &&
    selectedFilters.contactInfo.length > 0
  ) {
    const contactFilters = selectedFilters.contactInfo as string[]

    if (contactFilters.includes('has:email')) {
      vars.hasEmail = true
    }
    if (contactFilters.includes('missing:email')) {
      vars.missingEmail = true
    }
    if (contactFilters.includes('has:phone')) {
      vars.hasPhone = true
    }
    if (contactFilters.includes('missing:phone')) {
      vars.missingPhone = true
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
