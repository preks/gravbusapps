import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunityAggregates } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { createTTLCache, createCacheUtils } from '@/common/utils/ttlCache'

// Metrics interface for exit opportunities
export interface ExitOpportunityMetrics {
  totalCount: number
  totalValue: number
  averageValue: number
  averageWinRate: number
  wonCount: number
  totalWonValue: number
  countChange: number
  totalValueChange: number
  averageValueChange: number
  winRateChange: number
}

const HISTORICAL_DAYS = 91

// Global cache instance with TTL management - typed for metrics
const metricsCache = createTTLCache<Partial<ExitOpportunityMetrics>>()

export interface UseExitOpportunityMetricsProps extends BusinessAppContextProps {
  filters?: any
}

export const useExitOpportunityMetrics = ({ accessToken, filters }: UseExitOpportunityMetricsProps) => {
  const [metrics, setMetrics] = useState<ExitOpportunityMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentOpportunityAggregates } = useGetInvestmentOpportunityAggregates({ accessToken })

  // Race condition protection: track request IDs to ignore stale responses
  const requestIdRef = useRef(0)

  // Register hook with cache and setup cleanup on unmount
  useEffect(() => {
    const unregister = metricsCache.registerHook()

    // Cleanup on unmount
    return () => {
      unregister()
    }
  }, [])

  // Generate cache key based on filters
  const getCacheKey = useCallback((filters: any, dateRange: { from: string; to: string }) => {
    return `exit-metrics-${JSON.stringify(filters)}-${dateRange.from}-${dateRange.to}`
  }, [])

  // Check if cached data is still valid using TTL cache
  const getCachedMetrics = useCallback((cacheKey: string): Partial<ExitOpportunityMetrics> | null => {
    return metricsCache.get(cacheKey)
  }, [])

  // Store metrics in cache using TTL cache
  const setCachedMetrics = useCallback(
    (cacheKey: string, metrics: Partial<ExitOpportunityMetrics>, customTtlMs?: number) => {
      metricsCache.set(cacheKey, metrics, customTtlMs)
    },
    []
  )

  // Create targeted GraphQL query for metrics aggregation
  const buildMetricsQuery = useCallback(
    (variables: InvestmentOpportunityQueryVariables, dateRange?: { from: string; to: string }) => {
      const baseVariables = {
        ...variables,
        dealType: 'DIVESTMENT_DEAL', // Fixed filter for divestment opportunities
        limit: 100, // Smaller limit for metrics calculation
        offset: 0
      }

      // Add date range filtering at query level instead of client-side
      if (dateRange) {
        baseVariables.createdAtFrom = dateRange.from
        baseVariables.createdAtTo = dateRange.to
      }

      return baseVariables
    },
    []
  )

  // Calculate metrics using purely server-side aggregates
  const calculateMetricsFromAggregates = useCallback(
    async (variables: InvestmentOpportunityQueryVariables): Promise<Partial<ExitOpportunityMetrics>> => {
      try {
        // Get aggregates for all opportunities and won opportunities from server
        const aggregateResult = await fetchInvestmentOpportunityAggregates(variables)
        const allAggregate = aggregateResult.InvestmentOpportunityAggregate?.aggregate
        const wonAggregate = aggregateResult.InvestmentOpportunityWonAggregate?.aggregate

        if (!allAggregate) {
          return {
            totalCount: 0,
            totalValue: 0,
            averageValue: 0,
            averageWinRate: 0,
            wonCount: 0,
            totalWonValue: 0
          }
        }

        const totalCount = allAggregate.count || 0
        const wonCount = wonAggregate?.count || 0

        // Calculate win rate as percentage: won opportunities / total opportunities * 100
        const averageWinRate = totalCount > 0 ? (wonCount / totalCount) * 100 : 0

        return {
          totalCount,
          totalValue: allAggregate.sum?.estimatedAmount || 0,
          averageValue: allAggregate.avg?.estimatedAmount || 0,
          averageWinRate,
          wonCount,
          totalWonValue: wonAggregate?.sum?.estimatedAmount || 0
        }
      } catch (error) {
        console.error('Error calculating metrics from aggregates:', error)
        throw error
      }
    },
    [fetchInvestmentOpportunityAggregates]
  )

  // Calculate percentage change between current and historical
  const calculatePercentageChange = useCallback((current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }, [])

  // Load current and historical metrics with optimized queries
  const loadMetrics = useCallback(
    async (baseFilters: any = {}) => {
      if (!accessToken) return

      // Increment request ID to track this specific request
      const currentRequestId = ++requestIdRef.current

      setIsLoading(true)
      setError(null)

      try {
        const currentDate = new Date()
        const historicalDate = new Date()
        historicalDate.setDate(currentDate.getDate() - HISTORICAL_DAYS)

        // Create a proper historical range spanning from 91 days ago to now
        const historicalDateRange = {
          from: historicalDate.toISOString(),
          to: currentDate.toISOString()
        }

        // Check cache for historical metrics first
        const historicalCacheKey = getCacheKey(baseFilters, historicalDateRange)
        let historicalMetrics = getCachedMetrics(historicalCacheKey)

        // Calculate metrics using server-side aggregates
        const currentVariables = buildMetricsQuery(baseFilters)
        const currentMetricsData = await calculateMetricsFromAggregates(currentVariables)

        // Get or calculate historical metrics
        if (!historicalMetrics) {
          const historicalVariables = buildMetricsQuery(baseFilters, historicalDateRange)
          historicalMetrics = await calculateMetricsFromAggregates(historicalVariables)
          // Cache the historical metrics
          setCachedMetrics(historicalCacheKey, historicalMetrics)
        }

        // Race condition guard: only update state if this is still the latest request
        if (requestIdRef.current !== currentRequestId) {
          // This response is stale, ignore it
          return
        }

        // Ensure historical metrics have default values
        const safeHistoricalMetrics = {
          totalCount: 0,
          totalValue: 0,
          averageValue: 0,
          averageWinRate: 0,
          wonCount: 0,
          totalWonValue: 0,
          ...historicalMetrics
        }

        // Calculate percentage changes
        const finalMetrics: ExitOpportunityMetrics = {
          ...currentMetricsData,
          countChange: calculatePercentageChange(currentMetricsData.totalCount || 0, safeHistoricalMetrics.totalCount),
          totalValueChange: calculatePercentageChange(
            currentMetricsData.totalValue || 0,
            safeHistoricalMetrics.totalValue
          ),
          averageValueChange: calculatePercentageChange(
            currentMetricsData.averageValue || 0,
            safeHistoricalMetrics.averageValue
          ),
          winRateChange: calculatePercentageChange(
            currentMetricsData.averageWinRate || 0,
            safeHistoricalMetrics.averageWinRate
          )
        } as ExitOpportunityMetrics

        setMetrics(finalMetrics)
      } catch (err) {
        console.error('Error loading exit opportunity metrics:', err)

        // Race condition guard: only update error state if this is still the latest request
        if (requestIdRef.current === currentRequestId) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred')
        }
      } finally {
        // Race condition guard: only update loading state if this is still the latest request
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false)
        }
      }
    },
    [
      accessToken,
      buildMetricsQuery,
      calculateMetricsFromAggregates,
      calculatePercentageChange,
      getCacheKey,
      getCachedMetrics,
      setCachedMetrics
    ]
  )

  // Memoized return values with enhanced cache management
  const returnValues = useMemo(
    () => ({
      metrics,
      isLoading,
      error,
      loadMetrics,
      refreshMetrics: () => loadMetrics(filters),
      // Enhanced cache utilities with TTL support
      cache: createCacheUtils(metricsCache)
    }),
    [metrics, isLoading, error, loadMetrics, filters]
  )

  return returnValues
}

// Export cache utilities for testing and debugging
export const cacheUtils = createCacheUtils(metricsCache)

export default useExitOpportunityMetrics
