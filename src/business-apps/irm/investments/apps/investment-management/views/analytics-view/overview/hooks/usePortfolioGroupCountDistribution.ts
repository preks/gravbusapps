import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetGroupCountDistribution, type GroupDistributionData } from '../queries/PortfolioGroupDistributionQuery'

export interface GroupCountDistributionIntegration {
  data: GroupDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Portfolio group count distribution using server-side queries
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter (supports "All")
 * @returns Group count distribution data with loading/error states
 */
export const usePortfolioGroupCountDistribution = (
  context: BusinessAppContextProps,
  currency: string
): GroupCountDistributionIntegration => {
  const { fetchData } = useGetGroupCountDistribution(context, currency)
  const [data, setData] = useState<GroupDistributionData[]>([])
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
