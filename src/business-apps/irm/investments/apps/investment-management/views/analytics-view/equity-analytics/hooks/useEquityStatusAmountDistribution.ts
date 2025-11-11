import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityStatusAmountDistribution,
  type StatusAmountDistributionData
} from '../queries/EquityStatusAmountDistributionQuery'

export interface EquityStatusAmountDistributionIntegration {
  statusAmountDistribution: StatusAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches status amount distribution independently
 * Requires specific currency
 *
 * @param context - Business app context with access token
 * @param currency - Specific currency code (required)
 * @returns Status amount distribution data with loading/error states
 */
export const useEquityStatusAmountDistribution = (
  context: BusinessAppContextProps,
  currency: string
): EquityStatusAmountDistributionIntegration => {
  const { fetchStatusAmountDistribution } = useGetEquityStatusAmountDistribution(context)
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
      const amountData = await fetchStatusAmountDistribution(currency)
      setStatusAmountDistribution(amountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchStatusAmountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    statusAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
