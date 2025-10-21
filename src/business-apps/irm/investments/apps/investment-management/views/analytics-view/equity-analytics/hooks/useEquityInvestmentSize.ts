import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentSizeData, type InvestmentSizeRangeData } from '../queries/EquityInvestmentSizeQuery'

interface UseEquityInvestmentSizeResult {
  investmentSizeData: InvestmentSizeRangeData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch investment size distribution data
 * Uses server-side aggregate queries with fixed size ranges
 */
export const useEquityInvestmentSize = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityInvestmentSizeResult => {
  const { fetchInvestmentSizeData } = useGetInvestmentSizeData(context)
  const [investmentSizeData, setInvestmentSizeData] = useState<InvestmentSizeRangeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('⚠️ Investment Size hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Investment Size hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Investment Size hook: Starting data load...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentSizeData(currency)
      setInvestmentSizeData(result)
      console.log('✅ Investment Size hook: Data set successfully')
    } catch (err) {
      console.error('❌ Investment Size hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Investment Size hook: Load completed')
    }
  }, [context.accessToken, currency, fetchInvestmentSizeData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    investmentSizeData,
    isLoading,
    error,
    refetch: loadData
  }
}
