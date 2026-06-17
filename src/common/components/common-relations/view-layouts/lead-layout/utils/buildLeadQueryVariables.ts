import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { CommonLeadQueryVariables } from '@/common/data/relations/queries/leadQueries'

export const LEAD_DATE_RANGE_FILTER_KEYS = ['createdAtRange', 'updatedAtRange'] as const

export interface BuildLeadQueryVariablesParams {
  pagination?: { pageIndex: number; pageSize: number }
  searchTerm?: string
  selectedFilters: Record<string, unknown>
  sorting?: Array<{ id: string; desc: boolean }>
  /**
   * Currently visible table column ids. When provided alongside a search term, free-text
   * search is restricted to the descriptors backing these columns.
   */
  visibleColumns?: string[]
}

export interface BuildLeadQueryVariablesOptions {
  /** Column ids that fall back to createdAt sort when selected. CRM list view only. */
  nonSortableColumns?: string[]
}

const processDateRangeFilters = (
  selectedFilters: Record<string, unknown>,
  dateRangeKeys: readonly string[],
  vars: CommonLeadQueryVariables
): void => {
  for (const rangeKey of dateRangeKeys) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) {
        vars[`${baseKey}From` as keyof CommonLeadQueryVariables] = normalized.from
      }
      if (normalized.to) {
        vars[`${baseKey}To` as keyof CommonLeadQueryVariables] = normalized.to
      }
    }
  }
}

const processSensitiveFilter = (selectedFilters: Record<string, unknown>, vars: CommonLeadQueryVariables): void => {
  if (selectedFilters.sensitive === undefined || selectedFilters.sensitive === null) {
    return
  }

  if (Array.isArray(selectedFilters.sensitive) && selectedFilters.sensitive.length > 0) {
    const sensitiveValue = selectedFilters.sensitive[0]
    if (sensitiveValue === 'true') {
      vars.sensitive = true
    } else if (sensitiveValue === 'false') {
      vars.sensitive = false
    }
  }
}

const processOtherFilters = (
  selectedFilters: Record<string, unknown>,
  excludeKeys: string[],
  vars: CommonLeadQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof CommonLeadQueryVariables] = selectedFilters[key] as never
    }
  }
}

const processSorting = (
  sorting: Array<{ id: string; desc: boolean }> | undefined,
  vars: CommonLeadQueryVariables,
  nonSortableColumns: string[]
): void => {
  if (!sorting || sorting.length === 0) {
    vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    return
  }

  const columnId = sorting[0].id
  const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

  if (nonSortableColumns.includes(columnId)) {
    vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    return
  }

  if (columnId === 'lead') {
    vars.orderBy = [
      { field: 'firstName', direction },
      { field: 'lastName', direction }
    ]
    return
  }

  vars.orderBy = [{ field: columnId, direction }]
}

/**
 * Builds lead list/export GraphQL variables from UI filter state.
 * Shared by CRM LeadView, IRM LeadView, and settings data export.
 */
export function buildLeadQueryVariables<T extends CommonLeadQueryVariables>(
  params: BuildLeadQueryVariablesParams,
  options: BuildLeadQueryVariablesOptions = {}
): T {
  const { pagination, searchTerm = '', selectedFilters, sorting, visibleColumns } = params
  const nonSortableColumns = options.nonSortableColumns ?? []

  const vars = {} as T

  if (pagination) {
    vars.limit = pagination.pageSize
    vars.offset = pagination.pageIndex * pagination.pageSize
  }

  const trimmedSearch = searchTerm.trim()
  if (trimmedSearch) {
    vars.search = trimmedSearch
    // Restrict the generated search `_or` to the visible columns. The column ids line up
    // with descriptor keys, so they are used directly as the allowlist: buildWhere matches
    // them against the real descriptors (descriptors.filter(d => keys.includes(d.key))) and
    // non-text descriptors (date/number) self-skip in buildSearch. No static map needed.
    if (visibleColumns && visibleColumns.length > 0) {
      vars.searchDescriptorKeys = visibleColumns
    }
  }

  const excludeKeys = [...LEAD_DATE_RANGE_FILTER_KEYS, 'sensitive']
  processDateRangeFilters(selectedFilters, LEAD_DATE_RANGE_FILTER_KEYS, vars)
  processSensitiveFilter(selectedFilters, vars)
  processOtherFilters(selectedFilters, excludeKeys, vars)
  processSorting(sorting, vars, nonSortableColumns)

  return vars
}
