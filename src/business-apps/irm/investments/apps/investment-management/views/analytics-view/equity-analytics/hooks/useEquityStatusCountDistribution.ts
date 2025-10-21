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
 * Supports "All Currencies" option
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter (supports 'All Currencies')
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
      console.log('📊 Loading status COUNT distribution...', { currency })
      const countData = await fetchStatusCountDistribution(currency)
      setStatusCountDistribution(countData)
      console.log('✅ Status COUNT distribution loaded successfully')
    } catch (err) {
      console.error('❌ Error loading status count distribution:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchStatusCountDistribution])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    statusCountDistribution,
    isLoading,
    error,
    refetch: loadData
  }
}
