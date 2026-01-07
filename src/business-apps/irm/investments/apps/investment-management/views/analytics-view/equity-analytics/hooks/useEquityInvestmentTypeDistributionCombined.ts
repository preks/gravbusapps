import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityInvestmentTypeDistributionCombined,
  type InvestmentTypeDistributionData,
  type InvestmentTypeAmountDistributionData
} from '../queries/EquityInvestmentTypeDistributionCombinedQuery'

export interface EquityInvestmentTypeDistributionCombinedIntegration {
  investmentTypeCountDistribution: InvestmentTypeDistributionData[]
  investmentTypeAmountDistribution: InvestmentTypeAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Combined hook that fetches BOTH investment type count and amount distribution
 * This avoids duplicate GetDistinctInvestmentTypes queries by fetching distinct investment types once
 *
 * @param context - Business app context with access token
 * @param countCurrency - Currency for count distribution (supports 'All')
 * @param amountCurrency - Currency for amount distribution (specific currency only)
 * @returns Combined investment type distribution data with loading/error states
 */
export const useEquityInvestmentTypeDistributionCombined = (
  context: BusinessAppContextProps,
  countCurrency?: string,
  amountCurrency?: string
): EquityInvestmentTypeDistributionCombinedIntegration => {
  const { fetchCombinedInvestmentTypeDistribution } = useGetEquityInvestmentTypeDistributionCombined(context)
  const [investmentTypeCountDistribution, setInvestmentTypeCountDistribution] = useState<
    InvestmentTypeDistributionData[]
  >([])
  const [investmentTypeAmountDistribution, setInvestmentTypeAmountDistribution] = useState<
    InvestmentTypeAmountDistributionData[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { countData, amountData } = await fetchCombinedInvestmentTypeDistribution(countCurrency, amountCurrency)
      setInvestmentTypeCountDistribution(countData)
      setInvestmentTypeAmountDistribution(amountData)
    } catch (err) {
      console.error('Error loading combined equity investment type distribution:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, countCurrency, amountCurrency, fetchCombinedInvestmentTypeDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    investmentTypeCountDistribution,
    investmentTypeAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
