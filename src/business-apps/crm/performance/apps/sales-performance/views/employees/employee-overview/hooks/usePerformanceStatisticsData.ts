import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ALL_PERFORMANCE_STATISTICS } from '../queries/PerformanceStatisticsQueries'
import { PerformanceStatistics } from '../types/performanceTypes'

interface OpportunityAggregateResponse {
  aggregate: {
    sum?: { estimatedAmount: number | null }
    count?: number
  }
}

interface PerformanceStatisticsResponse {
  totalRevenue: OpportunityAggregateResponse
  totalOpportunities: OpportunityAggregateResponse
  pipelineValue: OpportunityAggregateResponse
  revenue30d: OpportunityAggregateResponse
  totalOpportunities30d: OpportunityAggregateResponse
  pipelineValue30d: OpportunityAggregateResponse
  sampleOpportunity: Array<{
    currencyRef: string | null
    currency: { value: string; code: string } | null
  }>
}

export interface UsePerformanceStatisticsDataReturn {
  statistics: PerformanceStatistics
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_STATISTICS: PerformanceStatistics = {
  totalRevenue: 0,
  wonOpportunities: 0,
  totalOpportunities: 0,
  winRate: 0,
  pipelineValue: 0,
  currencyId: 'EUR',
  trends: {
    revenueChange: 0,
    wonOpportunitiesChange: 0,
    winRateChange: 0,
    pipelineChange: 0
  }
}

const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return ((current - previous) / previous) * 100
}

export const usePerformanceStatisticsData = (
  context: BusinessAppContextProps,
  employeeId: string,
  currencyCode?: string
): UsePerformanceStatisticsDataReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [statistics, setStatistics] = useState<PerformanceStatistics>(DEFAULT_STATISTICS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const extractCurrencyCode = useCallback(
    (currencyRef: string | null, currencyObj: { code?: string } | null): string => {
      if (currencyObj?.code) {
        return currencyObj.code
      }

      if (currencyRef) {
        return currencyRef.split(':').pop() || 'EUR'
      }

      return 'EUR'
    },
    []
  )

  const fetchStatistics = useCallback(async () => {
    if (!context.accessToken || !employeeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ALL_PERFORMANCE_STATISTICS(currencyCode)
      const response = await graphqlClient.request<PerformanceStatisticsResponse>(query, {
        employeeId
      })

      const totalRevenue = response.totalRevenue?.aggregate?.sum?.estimatedAmount ?? 0
      const wonOpportunities = response.totalRevenue?.aggregate?.count ?? 0
      const totalOpportunities = response.totalOpportunities?.aggregate?.count ?? 0
      const pipelineValue = response.pipelineValue?.aggregate?.sum?.estimatedAmount ?? 0

      const revenue30d = response.revenue30d?.aggregate?.sum?.estimatedAmount ?? 0
      const wonOpportunities30d = response.revenue30d?.aggregate?.count ?? 0
      const totalOpportunities30d = response.totalOpportunities30d?.aggregate?.count ?? 0
      const pipelineValue30d = response.pipelineValue30d?.aggregate?.sum?.estimatedAmount ?? 0

      const winRate = totalOpportunities > 0 ? Math.round((wonOpportunities / totalOpportunities) * 100) : 0
      const winRate30d = totalOpportunities30d > 0 ? Math.round((wonOpportunities30d / totalOpportunities30d) * 100) : 0

      const sampleOpp = response.sampleOpportunity?.[0]
      const detectedCurrencyCode = extractCurrencyCode(sampleOpp?.currencyRef ?? null, sampleOpp?.currency ?? null)

      setStatistics({
        totalRevenue,
        wonOpportunities,
        totalOpportunities,
        winRate,
        pipelineValue,
        currencyId: currencyCode || detectedCurrencyCode,
        trends: {
          revenueChange: calculatePercentageChange(totalRevenue, revenue30d),
          wonOpportunitiesChange: calculatePercentageChange(wonOpportunities, wonOpportunities30d),
          winRateChange: calculatePercentageChange(winRate, winRate30d),
          pipelineChange: calculatePercentageChange(pipelineValue, pipelineValue30d)
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch performance statistics'
      console.error('Error fetching performance statistics:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, employeeId, currencyCode, graphqlClient, extractCurrencyCode])

  useEffect(() => {
    fetchStatistics().catch(() => undefined)
  }, [fetchStatistics])

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  }
}
