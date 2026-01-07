import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetConcentrationData, type ConcentrationData } from '../queries/EquityConcentrationQuery'

interface UseEquityConcentrationByRoleResult {
  concentrationData: ConcentrationData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Independent hook for Portfolio Concentration by Role chart data
 * Only refetches when its own currency changes
 */
export const useEquityConcentrationByRole = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityConcentrationByRoleResult => {
  const { fetchConcentrationData } = useGetConcentrationData(context)
  const [concentrationData, setConcentrationData] = useState<ConcentrationData[]>([])
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
      const result = await fetchConcentrationData(currency)
      setConcentrationData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchConcentrationData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    concentrationData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
