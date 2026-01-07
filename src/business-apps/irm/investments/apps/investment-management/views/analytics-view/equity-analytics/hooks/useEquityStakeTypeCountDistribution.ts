import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityStakeTypeCountDistribution,
  type StakeTypeCountDistributionData
} from '../queries/EquityStakeTypeCountDistributionQuery'

export interface EquityStakeTypeCountDistributionIntegration {
  stakeTypeCountDistribution: StakeTypeCountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches stake type count distribution independently
 * Supports "All" option
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter (supports 'All')
 * @returns Stake type count distribution data with loading/error states
 */
export const useEquityStakeTypeCountDistribution = (
  context: BusinessAppContextProps,
  currency?: string
): EquityStakeTypeCountDistributionIntegration => {
  const { fetchStakeTypeCountDistribution } = useGetEquityStakeTypeCountDistribution(context)
  const [stakeTypeCountDistribution, setStakeTypeCountDistribution] = useState<StakeTypeCountDistributionData[]>([])
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
      const countData = await fetchStakeTypeCountDistribution(currency)
      setStakeTypeCountDistribution(countData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchStakeTypeCountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    stakeTypeCountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
