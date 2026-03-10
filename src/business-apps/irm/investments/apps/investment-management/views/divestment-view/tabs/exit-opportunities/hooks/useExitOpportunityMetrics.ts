import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { createTTLCache, createCacheUtils } from '@/common/utils/ttlCache'
import {
  WON_STATUS_CONDITION,
  HISTORICAL_DAYS,
  type InvestmentOpportunityAggregateBlock
} from '../../../config/divestmentOpportunityConditions'

export interface ExitOpportunityMetrics {
  totalCount: number
  totalValue: number
  averageValue: number
  averageWinRate: number
  wonCount: number
  totalWonValue: number
  prevTotalCount: number
  prevTotalValue: number
  prevAverageValue: number
  prevAverageWinRate: number
}

const metricsCache = createTTLCache<ExitOpportunityMetrics>()

const COMBINED_AGGREGATES_QUERY = `
  query GetExitOpportunityMetrics(
    $currentWhere: InvestmentOpportunityBoolExp
    $currentWonWhere: InvestmentOpportunityBoolExp
    $historicalWhere: InvestmentOpportunityBoolExp
    $historicalWonWhere: InvestmentOpportunityBoolExp
  ) {
    currentAll: InvestmentOpportunityAggregate(where: $currentWhere) {
      aggregate { count sum { estimatedAmount } avg { estimatedAmount } }
    }
    currentWon: InvestmentOpportunityAggregate(where: $currentWonWhere) {
      aggregate { count sum { estimatedAmount } }
    }
    historicalAll: InvestmentOpportunityAggregate(where: $historicalWhere) {
      aggregate { count sum { estimatedAmount } avg { estimatedAmount } }
    }
    historicalWon: InvestmentOpportunityAggregate(where: $historicalWonWhere) {
      aggregate { count sum { estimatedAmount } }
    }
  }
`

interface CombinedAggregatesResponse {
  currentAll: InvestmentOpportunityAggregateBlock
  currentWon: InvestmentOpportunityAggregateBlock
  historicalAll: InvestmentOpportunityAggregateBlock
  historicalWon: InvestmentOpportunityAggregateBlock
}

export interface UseExitOpportunityMetricsProps extends BusinessAppContextProps {
  filters?: any
}

function buildWhereConditions(
  variables: InvestmentOpportunityQueryVariables,
  extraConditions: Record<string, any>[] = []
) {
  const customConditions: Record<string, any>[] = [{ divestmentId: { _isNull: false } }, ...extraConditions]

  if (variables.dealType) {
    customConditions.push({ dealType: { _eq: variables.dealType } })
  }
  if (variables.currencyCode?.trim()) {
    customConditions.push({ currency: { code: { _eq: variables.currencyCode.trim() } } })
  }

  return buildWhere({
    variables,
    descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
    customConditions
  })
}

export const useExitOpportunityMetrics = ({ accessToken, filters }: UseExitOpportunityMetricsProps) => {
  const [metrics, setMetrics] = useState<ExitOpportunityMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const unregister = metricsCache.registerHook()
    return () => {
      unregister()
    }
  }, [])

  const loadMetrics = useCallback(
    async (baseFilters: any = {}) => {
      if (!accessToken) return

      const currentRequestId = ++requestIdRef.current
      setIsLoading(true)
      setError(null)

      try {
        const cacheKey = `exit-metrics-${JSON.stringify(baseFilters)}`
        const cached = metricsCache.get(cacheKey)
        if (cached) {
          if (requestIdRef.current === currentRequestId) {
            setMetrics(cached)
            setIsLoading(false)
          }
          return
        }

        const currentDate = new Date()
        const historicalDate = new Date()
        historicalDate.setDate(currentDate.getDate() - HISTORICAL_DAYS)

        const baseVars: InvestmentOpportunityQueryVariables = {
          dealType: 'DIVESTMENT_DEAL',
          ...baseFilters
        }

        const historicalVars: InvestmentOpportunityQueryVariables = {
          ...baseVars,
          createdAtFrom: historicalDate.toISOString(),
          createdAtTo: currentDate.toISOString()
        }

        const currentWhere = buildWhereConditions(baseVars)
        const currentWonWhere = buildWhereConditions(baseVars, [WON_STATUS_CONDITION])
        const historicalWhere = buildWhereConditions(historicalVars)
        const historicalWonWhere = buildWhereConditions(historicalVars, [WON_STATUS_CONDITION])

        const result = await graphqlClient.request<CombinedAggregatesResponse>(COMBINED_AGGREGATES_QUERY, {
          currentWhere,
          currentWonWhere,
          historicalWhere,
          historicalWonWhere
        })

        if (requestIdRef.current !== currentRequestId) return

        const cur = result.currentAll.aggregate
        const curWon = result.currentWon.aggregate
        const hist = result.historicalAll.aggregate
        const histWon = result.historicalWon.aggregate

        const totalCount = cur?.count || 0
        const wonCount = curWon?.count || 0
        const histTotalCount = hist?.count || 0
        const histWonCount = histWon?.count || 0

        const averageWinRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0
        const histWinRate = histTotalCount > 0 ? (histWonCount / histTotalCount) * 100 : 0

        const finalMetrics: ExitOpportunityMetrics = {
          totalCount,
          totalValue: cur?.sum?.estimatedAmount || 0,
          averageValue: cur?.avg?.estimatedAmount || 0,
          averageWinRate,
          wonCount,
          totalWonValue: curWon?.sum?.estimatedAmount || 0,
          prevTotalCount: histTotalCount,
          prevTotalValue: hist?.sum?.estimatedAmount || 0,
          prevAverageValue: hist?.avg?.estimatedAmount || 0,
          prevAverageWinRate: histWinRate
        }

        metricsCache.set(cacheKey, finalMetrics)
        setMetrics(finalMetrics)
      } catch (err) {
        if (requestIdRef.current === currentRequestId) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred')
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false)
        }
      }
    },
    [accessToken, graphqlClient]
  )

  const returnValues = useMemo(
    () => ({
      metrics,
      isLoading,
      error,
      loadMetrics,
      refreshMetrics: () => loadMetrics(filters),
      cache: createCacheUtils(metricsCache)
    }),
    [metrics, isLoading, error, loadMetrics, filters]
  )

  return returnValues
}

export const cacheUtils = createCacheUtils(metricsCache)

export default useExitOpportunityMetrics
