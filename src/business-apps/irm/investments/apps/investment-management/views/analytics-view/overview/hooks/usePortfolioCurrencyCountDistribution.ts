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

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchData()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, fetchData])

  useEffect(() => {
    void loadData()
  }, [context.accessToken])

  return {
    data,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
