import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetPropertyValueVsRent, type PropertyValueVsRentData } from '../queries/RealEstatePropertyValueVsRentQuery'

export interface PropertyValueVsRentIntegration {
  data: PropertyValueVsRentData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Real Estate property value vs rent data using server-side queries
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter
 * @returns Property value vs rent data with loading/error states
 */
export const useRealEstatePropertyValueVsRent = (
  context: BusinessAppContextProps,
  currency: string
): PropertyValueVsRentIntegration => {
  const { fetchData } = useGetPropertyValueVsRent(context, currency)
  const [data, setData] = useState<PropertyValueVsRentData[]>([])
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
