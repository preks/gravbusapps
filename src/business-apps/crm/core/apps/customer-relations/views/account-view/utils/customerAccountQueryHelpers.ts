import type { CustomerAccountQueryVariables } from '@/common/data/customer/queries/customerAccountQueries'

/**
 * Apply basic filter fields to Customer Account query variables
 */
export const applyBasicFilters = (vars: CustomerAccountQueryVariables, selectedFilters: Record<string, any>): void => {
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

  // Record State filter (Status)
  if (
    selectedFilters.recordStates &&
    Array.isArray(selectedFilters.recordStates) &&
    selectedFilters.recordStates.length > 0
  ) {
    vars.recordStates = selectedFilters.recordStates
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
 * Apply date range filters to Customer Account query variables
 */
export const applyDateFilter = (vars: CustomerAccountQueryVariables, selectedFilters: Record<string, any>): void => {
  if (selectedFilters.createdAfter) {
    vars.createdAfter = selectedFilters.createdAfter
  }

  if (selectedFilters.createdBefore) {
    vars.createdBefore = selectedFilters.createdBefore
  }
}

/**
 * Map column IDs to GraphQL field names for Customer Accounts
 */
export const mapColumnToGraphQLField = (columnId: string): string => {
  const mapping: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    location: 'createdAt',
    industryClass: 'industry',
    legalForm: 'legalForm',
    size: 'numberOfEmployees',
    ownerEmployee: 'ownerEmployee',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
  return mapping[columnId] || 'createdAt'
}
