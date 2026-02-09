import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentPortfolioKPIs } from '../types'
import { useGetPortfolioKPIs } from '../queries/PortfolioKPIQueries'

export const useInvestmentPortfolioIntegration = (
  context: BusinessAppContextProps,
  selectedCurrency?: string,
  filters?: Record<string, any>,
  enabled: boolean = true
) => {
  const [kpis, setKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    totalAmountInvested: 0,
    activeInvestments: 0,
    averageInvestmentValue: 0,
    averageMarketValue: 0
  })
  const [previousKpis, setPreviousKPIs] = useState<InvestmentPortfolioKPIs>({
    totalPortfolioValue: 0,
    totalInvestments: 0,
    totalAmountInvested: 0,
    activeInvestments: 0,
    averageInvestmentValue: 0,
    averageMarketValue: 0
  })
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  const { fetchPortfolioKPIs } = useGetPortfolioKPIs(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Fetch only KPIs with real historical comparison
      const kpiResult = await fetchPortfolioKPIs(selectedCurrency, filters)

      // Use real KPI data with historical comparison
      setKPIs(kpiResult.current)
      setPreviousKPIs(kpiResult.previous)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, fetchPortfolioKPIs, selectedCurrency, filters])

  useEffect(() => {
    if (enabled && context.accessToken) {
      void loadData()
    } else if (!enabled) {
      setIsLoading(false)
    }
    // Serialize filters to prevent infinite loops from object reference changes
  }, [enabled, context.accessToken, selectedCurrency, JSON.stringify(filters)])

  return {
    kpis,
    previousKpis,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
