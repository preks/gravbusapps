import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetInvestmentDurationData,
  type InvestmentDurationRangeData
} from '../queries/EquityInvestmentDurationQuery'

interface UseEquityInvestmentDurationResult {
  investmentDurationData: InvestmentDurationRangeData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch investment duration distribution data
 * Uses server-side aggregate queries with fixed duration ranges
 */
export const useEquityInvestmentDuration = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityInvestmentDurationResult => {
  const { fetchInvestmentDurationData } = useGetInvestmentDurationData(context)
  const [investmentDurationData, setInvestmentDurationData] = useState<InvestmentDurationRangeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('⚠️ Investment Duration hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Investment Duration hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Investment Duration hook: Starting data load...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentDurationData(currency)
      setInvestmentDurationData(result)
      console.log('✅ Investment Duration hook: Data set successfully')
    } catch (err) {
      console.error('❌ Investment Duration hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Investment Duration hook: Load completed')
    }
  }, [context.accessToken, currency, fetchInvestmentDurationData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    investmentDurationData,
    isLoading,
    error,
    refetch: loadData
  }
}
