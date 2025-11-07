/**
 * Account Query Helpers
 * Shared utilities for building account queries across Customer and Investment relations
 */

/**
 * Apply account filters to query variables
 * Works with both CustomerAccountQueryVariables and InvestmentAccountQueryVariables
 */
export const applyAccountFilters = (vars: any, selectedFilters: Record<string, any>) => {
  // Owner filter
  if (selectedFilters.owners && selectedFilters.owners.length > 0) {
    vars.ownerEmployeeIds = selectedFilters.owners
  }

  // Industry filter
  if (selectedFilters.industries && selectedFilters.industries.length > 0) {
    vars.industryIds = selectedFilters.industries
  }

  // Legal Form filter
  if (selectedFilters.legalForms && selectedFilters.legalForms.length > 0) {
    vars.legalFormIds = selectedFilters.legalForms
  }

  // Company Size filter
  if (selectedFilters.companySizes && selectedFilters.companySizes.length > 0) {
    vars.companySizeIds = selectedFilters.companySizes
  }

  // Revenue Band filter
  if (selectedFilters.revenueBands && selectedFilters.revenueBands.length > 0) {
    vars.revenueBandIds = selectedFilters.revenueBands
  }

  // Country filter
  if (selectedFilters.countries && selectedFilters.countries.length > 0) {
    vars.countryIds = selectedFilters.countries
  }

  // Region filter
  if (selectedFilters.regions && selectedFilters.regions.length > 0) {
    vars.regionIds = selectedFilters.regions
  }

  // Created Date Range
  if (selectedFilters.createdDateRange && selectedFilters.createdDateRange.length === 2) {
    const [start, end] = selectedFilters.createdDateRange
    if (start) vars.createdAfter = start
    if (end) vars.createdBefore = end
  }

  // Foundation Date Range
  if (selectedFilters.foundationDateRange && selectedFilters.foundationDateRange.length === 2) {
    const [start, end] = selectedFilters.foundationDateRange
    if (start) vars.foundedAfter = start
    if (end) vars.foundedBefore = end
  }
}

/**
 * Default column to GraphQL field mapping
 * Maps UI column IDs to GraphQL paths for sorting
 */
export const defaultAccountColumnMapping: Record<string, string | null> = {
  // Scalar fields
  name: 'name',
  website: 'website',
  foundationDate: 'foundationDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',

  // Catalog fields (sort by translated value)
  industry: 'industryClass.value', // Standard IRM naming
  legalForm: 'legalForm.value',
  companySize: 'companySize.value', // Standard IRM naming
  revenueBand: 'annualRevenueBand.value', // Standard IRM naming

  // Employee fields (sort by displayName)
  ownerEmployee: 'ownerEmployee.displayName',

  // Computed fields (non-sortable)
  location: null, // Can't sort on computed address
  communicationChannels: null // Can't sort on computed communication channels
}

/**
 * Create account column to GraphQL field mapping with optional overrides
 * Allows domain-specific field naming (CRM vs IRM)
 *
 * @param overrides - Override mapping for specific columns (e.g., CRM field names)
 * @returns Mapping function from column ID to GraphQL path
 *
 * @example
 * // IRM (uses standard naming - no overrides)
 * const mapper = createAccountColumnToGraphQLMapping()
 *
 * @example
 * // CRM (override for different field names)
 * const mapper = createAccountColumnToGraphQLMapping({
 *   industry: 'industry.value',           // CRM uses 'industry'
 *   companySize: 'numberOfEmployees.value', // CRM uses 'numberOfEmployees'
 *   revenueBand: 'annualRevenue.value'     // CRM uses 'annualRevenue'
 * })
 */
export const createAccountColumnToGraphQLMapping = (
  overrides?: Record<string, string | null>
): ((columnId: string) => string | null) => {
  const mapping = { ...defaultAccountColumnMapping, ...overrides }

  return (columnId: string) => {
    return mapping[columnId] !== undefined ? mapping[columnId] : columnId
  }
}
