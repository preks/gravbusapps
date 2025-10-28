import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityStakeTypeDistributionCombined,
  type StakeTypeDistributionData,
  type StakeTypeAmountDistributionData
} from '../queries/EquityStakeTypeDistributionCombinedQuery'

export interface EquityStakeTypeDistributionCombinedIntegration {
  stakeTypeCountDistribution: StakeTypeDistributionData[]
  stakeTypeAmountDistribution: StakeTypeAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Combined hook that fetches BOTH stake type count and amount distribution
 * This avoids duplicate GetDistinctStakeTypes queries by fetching distinct stake types once
 *
 * @param context - Business app context with access token
 * @param countCurrency - Currency for count distribution (supports 'All')
 * @param amountCurrency - Currency for amount distribution (specific currency only)
 * @returns Combined stake type distribution data with loading/error states
 */
export const useEquityStakeTypeDistributionCombined = (
  context: BusinessAppContextProps,
  countCurrency?: string,
  amountCurrency?: string
): EquityStakeTypeDistributionCombinedIntegration => {
  const { fetchCombinedStakeTypeDistribution } = useGetEquityStakeTypeDistributionCombined(context)
  const [stakeTypeCountDistribution, setStakeTypeCountDistribution] = useState<StakeTypeDistributionData[]>([])
  const [stakeTypeAmountDistribution, setStakeTypeAmountDistribution] = useState<StakeTypeAmountDistributionData[]>([])
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
      const { countData, amountData } = await fetchCombinedStakeTypeDistribution(countCurrency, amountCurrency)
      setStakeTypeCountDistribution(countData)
      setStakeTypeAmountDistribution(amountData)
    } catch (err) {
      console.error('Error loading combined equity stake type distribution:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, countCurrency, amountCurrency, fetchCombinedStakeTypeDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    stakeTypeCountDistribution,
    stakeTypeAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
