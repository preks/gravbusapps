import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityStatusDistributionCombined,
  type StatusDistributionData,
  type StatusAmountDistributionData
} from '../queries/EquityStatusDistributionCombinedQuery'

export interface EquityStatusDistributionCombinedIntegration {
  statusCountDistribution: StatusDistributionData[]
  statusAmountDistribution: StatusAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Combined hook that fetches BOTH status count and amount distribution
 * This avoids duplicate GetDistinctStatuses queries by fetching distinct statuses once
 *
 * @param context - Business app context with access token
 * @param countCurrency - Currency for count distribution (supports 'All')
 * @param amountCurrency - Currency for amount distribution (specific currency only)
 * @returns Combined status distribution data with loading/error states
 */
export const useEquityStatusDistributionCombined = (
  context: BusinessAppContextProps,
  countCurrency?: string,
  amountCurrency?: string
): EquityStatusDistributionCombinedIntegration => {
  const { fetchCombinedStatusDistribution } = useGetEquityStatusDistributionCombined(context)
  const [statusCountDistribution, setStatusCountDistribution] = useState<StatusDistributionData[]>([])
  const [statusAmountDistribution, setStatusAmountDistribution] = useState<StatusAmountDistributionData[]>([])
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
      const { countData, amountData } = await fetchCombinedStatusDistribution(countCurrency, amountCurrency)
      setStatusCountDistribution(countData)
      setStatusAmountDistribution(amountData)
    } catch (err) {
      console.error('Error loading combined equity status distribution:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, countCurrency, amountCurrency, fetchCombinedStatusDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    statusCountDistribution,
    statusAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
