import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'

/**
 * Apply basic filter fields to Customer Contact query variables
 */
export const applyBasicFilters = (vars: CustomerContactQueryVariables, selectedFilters: Record<string, any>): void => {
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
    selectedFilters.communicationChannels &&
    Array.isArray(selectedFilters.communicationChannels) &&
    selectedFilters.communicationChannels.length > 0
  ) {
    const contactFilters = selectedFilters.communicationChannels as string[]

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
 * Apply date range filters to Customer Contact query variables
 */
export const applyDateFilter = (vars: CustomerContactQueryVariables, selectedFilters: Record<string, any>): void => {
  if (selectedFilters.createdAfter) {
    vars.createdAfter = selectedFilters.createdAfter
  }

  if (selectedFilters.createdBefore) {
    vars.createdBefore = selectedFilters.createdBefore
  }
}

/**
 * Map column IDs to GraphQL field names for Customer Contacts
 * Only include columns that correspond to actual database fields
 */
export const mapColumnToGraphQLField = (columnId: string): string => {
  const mapping: Record<string, string> = {
    contact: 'firstName', // Sort by first name for contact column
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phone: 'phone',
    department: 'department',
    jobPosition: 'jobPosition',
    ownerEmployee: 'ownerEmployee',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
    // contactInfo, account, type are not sortable (computed/joined columns)
  }
  return mapping[columnId] || 'createdAt'
}
