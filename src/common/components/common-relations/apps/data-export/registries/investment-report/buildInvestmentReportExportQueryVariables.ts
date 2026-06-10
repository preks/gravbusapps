import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { InvestmentReportQueryVariables } from '@/common/data/investment/queries/investmentReportQueries.new'

export type InvestmentReportExportQueryVariables = InvestmentReportQueryVariables & {
  customConditions?: Record<string, unknown>[]
  investmentGroupIds?: string[]
}

const DATE_RANGE_FILTER_KEYS = ['dateRange', 'plannedExitDateRange', 'createdAtRange'] as const

function processDateRangeFilters(
  selectedFilters: Record<string, unknown>,
  vars: InvestmentReportExportQueryVariables
): void {
  for (const rangeKey of DATE_RANGE_FILTER_KEYS) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey] as string | string[] | undefined | null)
    if (!normalized) {
      continue
    }

    const baseKey = rangeKey.replace('Range', '')
    if (normalized.from) {
      vars[`${baseKey}From` as keyof InvestmentReportExportQueryVariables] = normalized.from as never
    }
    if (normalized.to) {
      vars[`${baseKey}To` as keyof InvestmentReportExportQueryVariables] = normalized.to as never
    }
  }
}

function extractStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const items = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
  return items.length > 0 ? items : undefined
}

function buildInvestmentGroupCondition(groupIds: string[]): Record<string, unknown> {
  return {
    investment: {
      investmentGroup: { id: { _in: groupIds } }
    }
  }
}

export function buildInvestmentReportExportQueryVariables(
  selectedFilters: Record<string, unknown>,
  pagination?: { limit?: number; offset?: number }
): InvestmentReportExportQueryVariables {
  const vars: InvestmentReportExportQueryVariables = {
    limit: pagination?.limit,
    offset: pagination?.offset ?? 0,
    orderBy: [{ field: 'date', direction: 'DESC_NULLS_LAST' }]
  }

  processDateRangeFilters(selectedFilters, vars)

  const investmentGroupIds = extractStringArray(selectedFilters.investmentGroupIds)
  const excludeKeys = new Set<string>([...DATE_RANGE_FILTER_KEYS, 'investmentGroupIds'])

  for (const [key, value] of Object.entries(selectedFilters)) {
    if (excludeKeys.has(key) || value === undefined || value === null) {
      continue
    }
    vars[key as keyof InvestmentReportExportQueryVariables] = value as never
  }

  if (investmentGroupIds) {
    vars.customConditions = [buildInvestmentGroupCondition(investmentGroupIds)]
  }

  return vars
}
