import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'

/** Days used as the "last quarter" comparison window across all divestment KPI queries. */
export const HISTORICAL_DAYS = 91

/**
 * Shared aggregate block shape returned by InvestmentOpportunity aggregate queries.
 * Used across ExitsStatistics and useExitOpportunityMetrics.
 */
export interface InvestmentOpportunityAggregateBlock {
  aggregate: {
    count: number
    sum?: { estimatedAmount: number }
    avg?: { estimatedAmount: number }
  } | null
}

/**
 * Won-status condition for Exits tab — matches opportunities whose status
 * code, value, or alternativeCode contains "won" (case-insensitive).
 */
export const WON_STATUS_CONDITION = {
  opportunityStatus: { code: { _ilike: '%won%' } }
}

/**
 * Builds custom GraphQL where conditions from opportunity query variables.
 * Handles dealType, accountSearch, currencyCode, estimatedAmountRanges,
 * and forecastedProfitBetween which are not processed by descriptors.
 *
 * @param extraConditions - Additional raw conditions merged in at the end
 *   (e.g. WON_STATUS_CONDITION for the Exits tab).
 */
export function buildOpportunityCustomConditions(
  variables: InvestmentOpportunityQueryVariables,
  extraConditions: Record<string, any>[] = []
): Record<string, any>[] {
  const conditions: Record<string, any>[] = []

  if (variables.dealType) conditions.push({ dealType: { _eq: variables.dealType } })

  if (variables.accountSearch?.trim()) {
    conditions.push({ account: { name: { _ilike: `%${variables.accountSearch.trim()}%` } } })
  }

  if (variables.currencyCode?.trim()) {
    conditions.push({ currency: { code: { _eq: variables.currencyCode.trim() } } })
  }

  if (variables.estimatedAmountRanges?.length) {
    const orConditions = variables.estimatedAmountRanges.flatMap(range => {
      const parts: any[] = []
      const amountCondition: any = {}
      if (range.min !== undefined) amountCondition._gte = range.min
      if (range.max !== undefined) amountCondition._lte = range.max
      if (Object.keys(amountCondition).length > 0) parts.push({ estimatedAmount: amountCondition })
      const includesZero = (range.min === undefined || range.min === 0) && (range.max === undefined || range.max >= 0)
      if (includesZero) parts.push({ estimatedAmount: { _isNull: true } })
      return parts
    })
    conditions.push({ _or: orConditions })
  }

  if (variables.forecastedProfitBetween) {
    conditions.push({
      forecastedProfitAmount: {
        _gte: variables.forecastedProfitBetween[0],
        _lte: variables.forecastedProfitBetween[1]
      }
    })
  }

  conditions.push(...extraConditions)

  return conditions
}
