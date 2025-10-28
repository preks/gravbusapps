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
      return
    }

    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentSizeData(currency)
      setInvestmentSizeData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchInvestmentSizeData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    investmentSizeData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
