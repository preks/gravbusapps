import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetCurrencyCountDistribution } from '../queries/PortfolioCurrencyDistributionQuery'

interface CurrencyCountData {
  currency: string
  count: number
}

interface UsePortfolioCurrencyCountDistributionResult {
  data: CurrencyCountData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePortfolioCurrencyCountDistribution = (
  context: BusinessAppContextProps
): UsePortfolioCurrencyCountDistributionResult => {
  const { fetchData } = useGetCurrencyCountDistribution(context)
  const [data, setData] = useState<CurrencyCountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    console.log('🔄 Loading currency count distribution data...')
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchData()
      console.log('✅ Currency count distribution data loaded successfully', { currencies: result.length })
      setData(result)
    } catch (err) {
      console.error('❌ Error loading currency count distribution data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, fetchData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    data,
    isLoading,
    error,
    refetch: loadData
  }
}
