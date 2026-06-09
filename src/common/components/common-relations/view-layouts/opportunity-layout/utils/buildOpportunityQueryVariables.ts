import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { CommonOpportunityQueryVariables } from '@/common/data/relations/queries/opportunityQueries'

export const OPPORTUNITY_DATE_RANGE_FILTER_KEYS = ['createdAtRange', 'updatedAtRange', 'closeDateRange'] as const

export interface BuildOpportunityQueryVariablesParams {
  pagination?: { pageIndex: number; pageSize: number }
  searchTerm?: string
  selectedFilters: Record<string, unknown>
  sorting?: Array<{ id: string; desc: boolean }>
}

export interface OpportunityAmountFilterVariables {
  estimatedAmountRanges?: Array<{ min?: number; max?: number }>
}

const processAmountFilter = (
  selectedFilters: Record<string, unknown>,
  vars: OpportunityAmountFilterVariables
): void => {
  if (!selectedFilters.amount || typeof selectedFilters.amount !== 'object') {
    return
  }

  const { min, max } = selectedFilters.amount as { min?: number | null; max?: number | null }
  if ((min !== null && min !== undefined) || (max !== null && max !== undefined)) {
    vars.estimatedAmountRanges = [
      {
        ...(min !== null && min !== undefined && { min }),
        ...(max !== null && max !== undefined && { max })
      }
    ]
  }
}

const processDateRangeFilters = (
  selectedFilters: Record<string, unknown>,
  vars: CommonOpportunityQueryVariables
): void => {
  for (const rangeKey of OPPORTUNITY_DATE_RANGE_FILTER_KEYS) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (normalized) {
      const baseKey = rangeKey.replace('Range', '')
      if (normalized.from) {
        vars[`${baseKey}From` as keyof CommonOpportunityQueryVariables] = normalized.from
      }
      if (normalized.to) {
        vars[`${baseKey}To` as keyof CommonOpportunityQueryVariables] = normalized.to
      }
    }
  }
}

const processOtherFilters = (
  selectedFilters: Record<string, unknown>,
  excludeKeys: readonly string[],
  vars: CommonOpportunityQueryVariables
): void => {
  for (const key of Object.keys(selectedFilters)) {
    if (!excludeKeys.includes(key) && selectedFilters[key] !== undefined && selectedFilters[key] !== null) {
      vars[key as keyof CommonOpportunityQueryVariables] = selectedFilters[key] as never
    }
  }
}

const processSorting = (
  sorting: Array<{ id: string; desc: boolean }> | undefined,
  vars: CommonOpportunityQueryVariables
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
 * Builds opportunity list/export GraphQL variables from UI filter state.
 * Mirrors opportunityConfigBuilder logic — used by settings data export.
 */
export function buildOpportunityQueryVariables<
  T extends CommonOpportunityQueryVariables & OpportunityAmountFilterVariables
>(params: BuildOpportunityQueryVariablesParams): T {
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

  processAmountFilter(selectedFilters, vars)
  processDateRangeFilters(selectedFilters, vars)
  processOtherFilters(selectedFilters, [...OPPORTUNITY_DATE_RANGE_FILTER_KEYS, 'amount'], vars)
  processSorting(sorting, vars)

  return vars
}
