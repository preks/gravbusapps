/**
 * Query helper utilities for Task views
 */

/**
 * Apply basic filter fields to query variables
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
 * Apply date range filters to query variables
 */
export const applyDateFilter = <T extends Record<string, any>>(vars: T, selectedFilters: Record<string, any>): void => {
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
