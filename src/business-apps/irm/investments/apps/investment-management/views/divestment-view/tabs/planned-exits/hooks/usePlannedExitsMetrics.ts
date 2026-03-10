import { useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { useKPIIntegration } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/hooks/useKPIIntegration'
import { HISTORICAL_DAYS } from '../../../config/divestmentOpportunityConditions'

export interface PlannedExitsKPIData {
  totalCount: number
  totalInvestmentValue: number
  totalMarketValue: number
  averagePerformance: number
}

const EMPTY_KPI: PlannedExitsKPIData = {
  totalCount: 0,
  totalInvestmentValue: 0,
  totalMarketValue: 0,
  averagePerformance: 0
}

const PLANNED_EXIT_QUERY = `
  query GetPlannedExitsKPIs(
    $currentWhere: InvestmentBoolExp,
    $previousWhere: InvestmentBoolExp
  ) {
    currentAggregate: InvestmentAggregate(where: $currentWhere) {
      aggregate {
        count
        sum {
          totalInvestmentAmount
          investmentMarketValue
        }
      }
      nodes {
        investmentMarketValue
        totalInvestmentAmount
      }
    }
    previousAggregate: InvestmentAggregate(where: $previousWhere) {
      aggregate {
        count
        sum {
          totalInvestmentAmount
          investmentMarketValue
        }
      }
      nodes {
        investmentMarketValue
        totalInvestmentAmount
      }
    }
  }
`

interface InvestmentAmountNode {
  investmentMarketValue: number | null
  totalInvestmentAmount: number | null
}

interface AggregateBlock {
  aggregate: {
    count: number
    sum: { totalInvestmentAmount: number; investmentMarketValue: number }
  }
  nodes: InvestmentAmountNode[]
}

interface AggregateResult {
  currentAggregate: AggregateBlock
  previousAggregate: AggregateBlock
}

function computeAveragePerformance(nodes: InvestmentAmountNode[]): number {
  if (!nodes || nodes.length === 0) return 0

  let sum = 0
  let validCount = 0

  for (const node of nodes) {
    const marketValue = node.investmentMarketValue || 0
    const investmentValue = node.totalInvestmentAmount || 0
    if (investmentValue > 0) {
      sum += ((marketValue - investmentValue) / investmentValue) * 100
      validCount++
    }
  }

  return validCount > 0 ? sum / validCount : 0
}

function transformAggregateToKPI(agg: AggregateBlock): PlannedExitsKPIData {
  const count = agg?.aggregate?.count || 0
  const totalInvestmentValue = agg?.aggregate?.sum?.totalInvestmentAmount || 0
  const totalMarketValue = agg?.aggregate?.sum?.investmentMarketValue || 0

  return {
    totalCount: count,
    totalInvestmentValue,
    totalMarketValue,
    averagePerformance: computeAveragePerformance(agg?.nodes || [])
  }
}

export const usePlannedExitsMetrics = (
  context: BusinessAppContextProps,
  currency?: string,
  filters?: Record<string, any>,
  enabled: boolean = true
) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const comparisonDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - HISTORICAL_DAYS)
    return date.toISOString()
  }, [])

  const fetchKPIs = useCallback(async () => {
    if (!context.accessToken) return { current: EMPTY_KPI, previous: EMPTY_KPI }

    const baseConditions: Record<string, any>[] = [{ planedExit: { _eq: true } }]
    if (currency) {
      baseConditions.push({ currency: { code: { _eq: currency } } })
    }

    const currentWhere = buildWhere({
      variables: filters || {},
      descriptors: INVESTMENT_DESCRIPTORS,
      customConditions: baseConditions,
      isDeleted: true
    })

    const previousWhere = buildWhere({
      variables: filters || {},
      descriptors: INVESTMENT_DESCRIPTORS,
      customConditions: [...baseConditions, { createdAt: { _lte: comparisonDate } }],
      isDeleted: true
    })

    const result = await graphqlClient.request<AggregateResult>(PLANNED_EXIT_QUERY, {
      currentWhere,
      previousWhere
    })

    return {
      current: transformAggregateToKPI(result.currentAggregate),
      previous: transformAggregateToKPI(result.previousAggregate)
    }
  }, [context.accessToken, graphqlClient, currency, filters, comparisonDate])

  return useKPIIntegration<PlannedExitsKPIData>(context, fetchKPIs, EMPTY_KPI, [currency, filters], enabled)
}
