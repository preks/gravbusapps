import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityStakeTypeAmountDistribution,
  type StakeTypeAmountDistributionData
} from '../queries/EquityStakeTypeAmountDistributionQuery'

export interface EquityStakeTypeAmountDistributionIntegration {
  stakeTypeAmountDistribution: StakeTypeAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches stake type amount distribution independently
 * Requires specific currency
 *
 * @param context - Business app context with access token
 * @param currency - Specific currency code (required)
 * @returns Stake type amount distribution data with loading/error states
 */
export const useEquityStakeTypeAmountDistribution = (
  context: BusinessAppContextProps,
  currency: string
): EquityStakeTypeAmountDistributionIntegration => {
  const { fetchStakeTypeAmountDistribution } = useGetEquityStakeTypeAmountDistribution(context)
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
      const amountData = await fetchStakeTypeAmountDistribution(currency)
      setStakeTypeAmountDistribution(amountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchStakeTypeAmountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    stakeTypeAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
