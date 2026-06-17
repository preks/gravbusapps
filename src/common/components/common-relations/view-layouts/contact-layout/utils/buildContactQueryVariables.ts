import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { CommonContactQueryVariables } from '@/common/data/relations/queries/contactQueries'

export const CONTACT_DATE_RANGE_FILTER_KEYS = ['createdAtRange', 'updatedAtRange'] as const

export interface ContactCommunicationFilterVariables {
  hasEmail?: boolean
  missingEmail?: boolean
  hasPhone?: boolean
  missingPhone?: boolean
}

export interface BuildContactQueryVariablesParams {
  pagination?: { pageIndex: number; pageSize: number }
  searchTerm?: string
  selectedFilters: Record<string, unknown>
  sorting?: Array<{ id: string; desc: boolean }>
  /** Column ids currently visible in the table; used to scope free-text search. */
  visibleColumns?: string[]
}

const processDateRangeFilters = (
  selectedFilters: Record<string, unknown>,
  dateRangeKeys: readonly string[],
  vars: CommonContactQueryVariables
): void => {
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) {
        vars[`${baseKey}From` as keyof CommonContactQueryVariables] = normalized.from
      }
      if (normalized.to) {
        vars[`${baseKey}To` as keyof CommonContactQueryVariables] = normalized.to
      }
    }
  }
}

const processCommunicationChannels = (
  selectedFilters: Record<string, unknown>,
  vars: ContactCommunicationFilterVariables
): void => {
  if (
    !selectedFilters.communicationChannels ||
    !Array.isArray(selectedFilters.communicationChannels) ||
    selectedFilters.communicationChannels.length === 0
  ) {
    return
  }

  const contactFilters = selectedFilters.communicationChannels as string[]
  if (contactFilters.includes('has:email')) vars.hasEmail = true
  if (contactFilters.includes('missing:email')) vars.missingEmail = true
  if (contactFilters.includes('has:phone')) vars.hasPhone = true
  if (contactFilters.includes('missing:phone')) vars.missingPhone = true
}

const processOtherFilters = (
  selectedFilters: Record<string, unknown>,
  excludeKeys: string[],
  vars: CommonContactQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof CommonContactQueryVariables] = selectedFilters[key] as never
    }
  }
}

const processSorting = (
  sorting: Array<{ id: string; desc: boolean }> | undefined,
  vars: CommonContactQueryVariables
): void => {
  if (!sorting || sorting.length === 0) {
    vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    return
  }

  const columnId = sorting[0].id
  const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

  if (columnId === 'contact') {
    vars.orderBy = [
      { field: 'firstName', direction },
      { field: 'lastName', direction }
    ]
    return
  }

  vars.orderBy = [{ field: columnId, direction }]
}

/**
 * Builds contact list/export GraphQL variables from UI filter state.
 * Shared by CRM ContactView, IRM ContactView, and settings data export.
 */
export function buildContactQueryVariables<T extends CommonContactQueryVariables & ContactCommunicationFilterVariables>(
  params: BuildContactQueryVariablesParams
): T {
  const { pagination, searchTerm = '', selectedFilters, sorting, visibleColumns } = params

  const vars = {} as T

  if (pagination) {
    vars.limit = pagination.pageSize
    vars.offset = pagination.pageIndex * pagination.pageSize
  }

  const trimmedSearch = searchTerm.trim()
  if (trimmedSearch) {
    vars.search = trimmedSearch
    // Scope free-text search to the visible table columns to keep the generated _or small.
    if (visibleColumns && visibleColumns.length > 0) {
      vars.searchDescriptorKeys = visibleColumns
    }
  }

  const excludeKeys = [...CONTACT_DATE_RANGE_FILTER_KEYS, 'communicationChannels']
  processDateRangeFilters(selectedFilters, CONTACT_DATE_RANGE_FILTER_KEYS, vars)
  processCommunicationChannels(selectedFilters, vars)
  processOtherFilters(selectedFilters, excludeKeys, vars)
  processSorting(sorting, vars)

  return vars
}
