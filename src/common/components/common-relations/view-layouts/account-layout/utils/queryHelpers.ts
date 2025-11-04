/**
 * Query helper utilities for Account views
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

  // Industry filter
  if (
    selectedFilters.industries &&
    Array.isArray(selectedFilters.industries) &&
    selectedFilters.industries.length > 0
  ) {
    vars.industryIds = selectedFilters.industries
  }

  // Legal Form filter
  if (
    selectedFilters.legalForms &&
    Array.isArray(selectedFilters.legalForms) &&
    selectedFilters.legalForms.length > 0
  ) {
    vars.legalFormIds = selectedFilters.legalForms
  }

  // Company Size filter
  if (
    selectedFilters.companySizes &&
    Array.isArray(selectedFilters.companySizes) &&
    selectedFilters.companySizes.length > 0
  ) {
    vars.companySizeIds = selectedFilters.companySizes
  }

  // Revenue Band filter
  if (
    selectedFilters.revenueBands &&
    Array.isArray(selectedFilters.revenueBands) &&
    selectedFilters.revenueBands.length > 0
  ) {
    vars.revenueBandIds = selectedFilters.revenueBands
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

  // Contact info filters (has/missing email, phone, website)
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
    if (contactFilters.includes('has:website')) {
      vars.hasWebsite = true
    }
    if (contactFilters.includes('missing:website')) {
      vars.missingWebsite = true
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
