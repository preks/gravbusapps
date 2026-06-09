import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { AccountQueryVariables } from '@/common/data/relations/queries/accountQueries'

export const ACCOUNT_DATE_RANGE_FILTER_KEYS = [
  'createdAtRange',
  'updatedAtRange',
  'foundationDateRange',
  'liquidationDateRange',
  'activeFromRange',
  'activeToRange'
] as const

export interface BuildAccountQueryVariablesParams {
  pagination?: { pageIndex: number; pageSize: number }
  searchTerm?: string
  selectedFilters: Record<string, unknown>
  sorting?: Array<{ id: string; desc: boolean }>
}

const processDateRangeFilters = (selectedFilters: Record<string, unknown>, vars: AccountQueryVariables): void => {
  for (const rangeKey of ACCOUNT_DATE_RANGE_FILTER_KEYS) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) {
        vars[`${baseKey}From` as keyof AccountQueryVariables] = normalized.from
      }
      if (normalized.to) {
        vars[`${baseKey}To` as keyof AccountQueryVariables] = normalized.to
      }
    }
  }
}

const processProspectiveFilter = (selectedFilters: Record<string, unknown>, vars: AccountQueryVariables): void => {
  if (!selectedFilters.prospective || !Array.isArray(selectedFilters.prospective)) {
    return
  }

  const prospectiveValues = selectedFilters.prospective as string[]
  if (prospectiveValues.length === 1) {
    vars.prospective = prospectiveValues[0] === 'true'
  }
}

const processOtherFilters = (
  selectedFilters: Record<string, unknown>,
  excludeKeys: readonly string[],
  vars: AccountQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof AccountQueryVariables] = selectedFilters[key] as never
    }
  }
}

const processSorting = (
  sorting: Array<{ id: string; desc: boolean }> | undefined,
  vars: AccountQueryVariables
): void => {
  if (!sorting || sorting.length === 0) {
    vars.orderBy = [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
    return
  }

  vars.orderBy = [
    {
      field: sorting[0].id,
      direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
    }
  ]
}

/**
 * Builds account list/export GraphQL variables from UI filter state.
 * Mirrors CRM/IRM AccountView logic — used by settings data export.
 */
export function buildAccountQueryVariables<T extends AccountQueryVariables>(
  params: BuildAccountQueryVariablesParams
): T {
  const { pagination, searchTerm = '', selectedFilters, sorting } = params

  const vars = {} as T

  if (pagination) {
    vars.limit = pagination.pageSize
    vars.offset = pagination.pageIndex * pagination.pageSize
  }

  const trimmedSearch = searchTerm.trim()
  if (trimmedSearch) {
    vars.search = trimmedSearch
  }

  processDateRangeFilters(selectedFilters, vars)
  processOtherFilters(selectedFilters, [...ACCOUNT_DATE_RANGE_FILTER_KEYS, 'prospective'], vars)
  processProspectiveFilter(selectedFilters, vars)
  processSorting(sorting, vars)

  return vars
}
