import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetOccupancyDistribution,
  type OccupancyDistributionData
} from '../queries/RealEstateOccupancyDistributionQuery'

export interface OccupancyDistributionIntegration {
  data: OccupancyDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Real Estate occupancy distribution using server-side queries
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter
 * @returns Occupancy distribution data with loading/error states
 */
export const useRealEstateOccupancyDistribution = (
  context: BusinessAppContextProps,
  currency: string
): OccupancyDistributionIntegration => {
  const { fetchData } = useGetOccupancyDistribution(context, currency)
  const [data, setData] = useState<OccupancyDistributionData[]>([])
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
  }, [currency, loadData])

  return {
    data,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
