import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetStatusCountDistribution } from '../queries/PortfolioStatusDistributionQuery'

interface StatusCountData {
  status: string
  count: number
}

interface UsePortfolioStatusCountDistributionResult {
  data: StatusCountData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const usePortfolioStatusCountDistribution = (
  context: BusinessAppContextProps,
  currency: string = 'All'
): UsePortfolioStatusCountDistributionResult => {
  const { fetchData } = useGetStatusCountDistribution(context, currency)
  const [data, setData] = useState<StatusCountData[]>([])
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
  }, [context.accessToken, currency, fetchData])

  useEffect(() => {
    void loadData()
  }, [context.accessToken, currency])

  return {
    data,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
