/**
 * Shared helper functions for entity tab components (Leads, Accounts, Contacts, Opportunities)
 * Consolidates duplicated filter and sorting processing logic
 */

import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

/**
 * Process date range filters and update query variables
 * @param selectedFilters The filters selected by the user
 * @param dateRangeKeys Array of date range filter keys (e.g., ['createdAtRange', 'updatedAtRange'])
 * @param vars The query variables object to update
 */
export const processDateRangeFilters = (
  selectedFilters: Record<string, any>,
  dateRangeKeys: string[],
  vars: Record<string, any>
): void => {
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) vars[`${baseKey}From`] = normalized.from
      if (normalized.to) vars[`${baseKey}To`] = normalized.to
    }
  }
}

/**
 * Process sensitive filter (boolean field with special handling)
 * @param selectedFilters The filters selected by the user
 * @param vars The query variables object to update
 */
export const processSensitiveFilter = (selectedFilters: Record<string, any>, vars: Record<string, any>): void => {
  if (selectedFilters.sensitive !== undefined && selectedFilters.sensitive !== null) {
    if (Array.isArray(selectedFilters.sensitive) && selectedFilters.sensitive.length > 0) {
      const sensitiveValue = selectedFilters.sensitive[0]
      if (sensitiveValue === 'true') {
        vars.sensitive = true
      } else if (sensitiveValue === 'false') {
        vars.sensitive = false
      }
    }
  }
}

/**
 * Process communication channel filters
 * @param selectedFilters The filters selected by the user
 * @param vars The query variables object to update
 */
export const processCommunicationChannels = (selectedFilters: Record<string, any>, vars: Record<string, any>): void => {
  if (selectedFilters.communicationChannels && Array.isArray(selectedFilters.communicationChannels)) {
    const channelFilters = selectedFilters.communicationChannels as string[]
    if (channelFilters.includes('has:email')) vars.hasEmail = true
    if (channelFilters.includes('missing:email')) vars.missingEmail = true
    if (channelFilters.includes('has:phone')) vars.hasPhone = true
    if (channelFilters.includes('missing:phone')) vars.missingPhone = true
  }
}

/**
 * Process all other filters (excluding specified keys)
 * @param selectedFilters The filters selected by the user
 * @param excludeKeys Array of filter keys to exclude from processing
 * @param vars The query variables object to update
 */
export const processOtherFilters = (
  selectedFilters: Record<string, any>,
  excludeKeys: string[],
  vars: Record<string, any>
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key] = selectedFilters[key]
    }
  }
}

/**
 * Process sorting configuration
 * @param sorting Array of sort configurations
 * @param vars The query variables object to update
 * @param nonSortableColumns Array of column IDs that cannot be sorted
 * @param specialSortColumns Map of column IDs to custom sort field configurations
 */
export const processSorting = (
  sorting: Array<{ id: string; desc: boolean }>,
  vars: Record<string, any>,
  nonSortableColumns: string[] = [],
  specialSortColumns: Record<string, Array<{ field: string; direction?: string }>> = {}
): void => {
  if (sorting.length > 0) {
    const columnId = sorting[0].id
    const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

    // Check if column is non-sortable
    if (nonSortableColumns.includes(columnId)) {
      vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
      return
    }

    // Check if column has special sort configuration
    if (specialSortColumns[columnId]) {
      vars.orderBy = specialSortColumns[columnId].map(config => ({
        field: config.field,
        direction: config.direction || direction
      }))
      return
    }

    // Default sorting
    vars.orderBy = [{ field: columnId, direction }]
  } else {
    // Default to createdAt descending
    vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
  }
}
