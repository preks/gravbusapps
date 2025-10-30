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
      return
    }

    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentDurationData(currency)
      setInvestmentDurationData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchInvestmentDurationData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    investmentDurationData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
