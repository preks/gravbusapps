import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetStatusAmountDistribution } from '../queries/PortfolioStatusDistributionQuery'

interface StatusAmountData {
  status: string
  totalAmount: number
}

interface UsePortfolioStatusAmountDistributionResult {
  data: StatusAmountData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePortfolioStatusAmountDistribution = (
  context: BusinessAppContextProps,
  currency: string
): UsePortfolioStatusAmountDistributionResult => {
  const { fetchData } = useGetStatusAmountDistribution(context, currency)
  const [data, setData] = useState<StatusAmountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    console.log('🔄 Loading status amount distribution data...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchData()
      console.log('✅ Status amount distribution data loaded successfully', { statuses: result.length })
      setData(result)
    } catch (err) {
      console.error('❌ Error loading status amount distribution data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchData])

  useEffect(() => {
    loadData()
  }, [currency, loadData])

  return {
    data,
    isLoading,
    error,
    refetch: loadData
  }
}
