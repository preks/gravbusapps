import { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import type { InvestmentViewKPIData } from '@/common/data/investment/kpis/types'
import { getUtcCalendarBoundaries } from '@/common/data/investment/utils/investmentViewKpiDateRanges'
import { useKPIIntegration } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/hooks/useKPIIntegration'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'

export type InvestmentViewKPIScope = 'overview' | { groupCode: string }

const ACTIVE_STATUS = { investmentStatus: { value: { _eq: 'Active' } } }

function buildScopeCustomConditions(scope: InvestmentViewKPIScope, selectedCurrency: string): Record<string, any>[] {
  const conditions: Record<string, any>[] = []
  if (scope !== 'overview') {
    conditions.push({ investmentGroup: { id: { _eq: `InvestmentGroup:v1:${scope.groupCode}` } } })
  }
  const code = selectedCurrency?.trim() || ''
  if (!isAllCurrencySelection(code)) {
    conditions.push({ currency: { code: { _eq: code } } })
  }
  return conditions
}

function buildWhereForKPI(
  filters: Record<string, any>,
  scope: InvestmentViewKPIScope,
  selectedCurrency: string,
  extra: Record<string, any>[]
): Record<string, any> {
  return buildWhere({
    variables: filters || {},
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [...buildScopeCustomConditions(scope, selectedCurrency), ...extra],
    isDeleted: true
  })
}

const EMPTY_KPI: InvestmentViewKPIData = {
  totalInvestments: 0,
  activeInvestments: 0,
  newThisQuarter: 0,
  newThisYear: 0
}

/**
 * Count-only KPIs for Investment View (overview + group tabs). One GraphQL round-trip.
 */
export function useInvestmentViewKPIIntegration(
  context: BusinessAppContextProps,
  scope: InvestmentViewKPIScope,
  filters: Record<string, any>,
  selectedCurrency: string,
  enabled: boolean = true
) {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const scopeKey = scope === 'overview' ? 'overview' : scope.groupCode
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters])

  const fetcher = useCallback(
    async (accessToken: string): Promise<{ current: InvestmentViewKPIData; previous: InvestmentViewKPIData }> => {
      if (!accessToken || !context.accessToken) {
        return { current: EMPTY_KPI, previous: EMPTY_KPI }
      }

      const scopeResolved: InvestmentViewKPIScope = scopeKey === 'overview' ? 'overview' : { groupCode: scopeKey }

      const filts = JSON.parse(filtersKey) as Record<string, any>

      const comparisonDate = new Date()
      comparisonDate.setDate(comparisonDate.getDate() - 91)
      const compIso = comparisonDate.toISOString()

      const bounds = getUtcCalendarBoundaries(new Date())

      const currentTotalWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [])
      const currentActiveWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [ACTIVE_STATUS])
      const previousTotalWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [
        { createdAt: { _lte: compIso } }
      ])
      const previousActiveWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [
        ACTIVE_STATUS,
        { createdAt: { _lte: compIso } }
      ])
      const newThisQuarterWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [
        { createdAt: { _gte: bounds.currentQuarterStart, _lt: bounds.currentQuarterEndExclusive } }
      ])
      const lastQuarterWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [
        { createdAt: { _gte: bounds.previousQuarterStart, _lt: bounds.previousQuarterEndExclusive } }
      ])
      const newThisYearWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [
        { createdAt: { _gte: bounds.currentYearStart, _lt: bounds.currentYearEndExclusive } }
      ])
      const lastYearWhere = buildWhereForKPI(filts, scopeResolved, selectedCurrency, [
        { createdAt: { _gte: bounds.previousYearStart, _lt: bounds.previousYearEndExclusive } }
      ])

      const query = `
        query GetInvestmentViewKPIs(
          $currentTotalWhere: InvestmentBoolExp!
          $currentActiveWhere: InvestmentBoolExp!
          $previousTotalWhere: InvestmentBoolExp!
          $previousActiveWhere: InvestmentBoolExp!
          $newThisQuarterWhere: InvestmentBoolExp!
          $lastQuarterWhere: InvestmentBoolExp!
          $newThisYearWhere: InvestmentBoolExp!
          $lastYearWhere: InvestmentBoolExp!
        ) {
          currentTotal: InvestmentAggregate(where: $currentTotalWhere) { aggregate { count } }
          currentActive: InvestmentAggregate(where: $currentActiveWhere) { aggregate { count } }
          previousTotal: InvestmentAggregate(where: $previousTotalWhere) { aggregate { count } }
          previousActive: InvestmentAggregate(where: $previousActiveWhere) { aggregate { count } }
          newThisQuarter: InvestmentAggregate(where: $newThisQuarterWhere) { aggregate { count } }
          lastQuarter: InvestmentAggregate(where: $lastQuarterWhere) { aggregate { count } }
          newThisYear: InvestmentAggregate(where: $newThisYearWhere) { aggregate { count } }
          lastYear: InvestmentAggregate(where: $lastYearWhere) { aggregate { count } }
        }
      `

      type Agg = { aggregate: { count: number } | null } | null
      const result = await graphqlClient.request<{
        currentTotal: Agg
        currentActive: Agg
        previousTotal: Agg
        previousActive: Agg
        newThisQuarter: Agg
        lastQuarter: Agg
        newThisYear: Agg
        lastYear: Agg
      }>(query, {
        currentTotalWhere: currentTotalWhere,
        currentActiveWhere: currentActiveWhere,
        previousTotalWhere: previousTotalWhere,
        previousActiveWhere: previousActiveWhere,
        newThisQuarterWhere: newThisQuarterWhere,
        lastQuarterWhere: lastQuarterWhere,
        newThisYearWhere: newThisYearWhere,
        lastYearWhere: lastYearWhere
      })

      const count = (a: Agg) => a?.aggregate?.count ?? 0

      return {
        current: {
          totalInvestments: count(result.currentTotal),
          activeInvestments: count(result.currentActive),
          newThisQuarter: count(result.newThisQuarter),
          newThisYear: count(result.newThisYear)
        },
        previous: {
          totalInvestments: count(result.previousTotal),
          activeInvestments: count(result.previousActive),
          newThisQuarter: count(result.lastQuarter),
          newThisYear: count(result.lastYear)
        }
      }
    },
    [context.accessToken, graphqlClient, filtersKey, scopeKey, selectedCurrency]
  )

  return useKPIIntegration<InvestmentViewKPIData>(
    context,
    fetcher,
    EMPTY_KPI,
    [scopeKey, filtersKey, selectedCurrency],
    enabled
  )
}
