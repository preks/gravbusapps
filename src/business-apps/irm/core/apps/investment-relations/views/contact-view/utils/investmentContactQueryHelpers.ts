import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'

/**
 * Apply basic filter fields to Investment Contact query variables
 */
export const applyBasicFilters = (
  vars: InvestmentContactQueryVariables,
  selectedFilters: Record<string, any>
): void => {
  // Owner filter
  if (selectedFilters.owners && Array.isArray(selectedFilters.owners) && selectedFilters.owners.length > 0) {
    vars.ownerEmployeeIds = selectedFilters.owners
  }

  // Academic Title filter
  if (
    selectedFilters.academicTitles &&
    Array.isArray(selectedFilters.academicTitles) &&
    selectedFilters.academicTitles.length > 0
  ) {
    vars.academicTitleIds = selectedFilters.academicTitles
  }

  // Salutation filter
  if (
    selectedFilters.salutations &&
    Array.isArray(selectedFilters.salutations) &&
    selectedFilters.salutations.length > 0
  ) {
    vars.salutationIds = selectedFilters.salutations
  }

  // Language filter
  if (selectedFilters.languages && Array.isArray(selectedFilters.languages) && selectedFilters.languages.length > 0) {
    vars.languageIds = selectedFilters.languages
  }

  // Department filter
  if (
    selectedFilters.departments &&
    Array.isArray(selectedFilters.departments) &&
    selectedFilters.departments.length > 0
  ) {
    vars.departments = selectedFilters.departments
  }

  // Job Position filter
  if (
    selectedFilters.jobPositions &&
    Array.isArray(selectedFilters.jobPositions) &&
    selectedFilters.jobPositions.length > 0
  ) {
    vars.jobPositions = selectedFilters.jobPositions
  }

  // Contact info filters
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
 * Apply date range filters to Investment Contact query variables
 */
export const applyDateFilter = (vars: InvestmentContactQueryVariables, selectedFilters: Record<string, any>): void => {
  if (selectedFilters.createdAfter) {
    vars.createdAfter = selectedFilters.createdAfter
  }

  if (selectedFilters.createdBefore) {
    vars.createdBefore = selectedFilters.createdBefore
  }
}

/**
 * Map column IDs to GraphQL field names for Investment Contacts
 */
export const mapColumnToGraphQLField = (columnId: string): string => {
  const mapping: Record<string, string> = {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phone: 'phone',
    department: 'department',
    jobPosition: 'jobPosition',
    ownerEmployee: 'ownerEmployee',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
  return mapping[columnId] || 'createdAt'
}
