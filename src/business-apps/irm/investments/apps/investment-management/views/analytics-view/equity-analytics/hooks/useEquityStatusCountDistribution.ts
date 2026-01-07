import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityStatusCountDistribution,
  type StatusCountDistributionData
} from '../queries/EquityStatusCountDistributionQuery'

export interface EquityStatusCountDistributionIntegration {
  statusCountDistribution: StatusCountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches status count distribution independently
 * Supports "All" option
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter (supports 'All')
 * @returns Status count distribution data with loading/error states
 */
export const useEquityStatusCountDistribution = (
  context: BusinessAppContextProps,
  currency?: string
): EquityStatusCountDistributionIntegration => {
  const { fetchStatusCountDistribution } = useGetEquityStatusCountDistribution(context)
  const [statusCountDistribution, setStatusCountDistribution] = useState<StatusCountDistributionData[]>([])
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
      const countData = await fetchStatusCountDistribution(currency)
      setStatusCountDistribution(countData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchStatusCountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    statusCountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
