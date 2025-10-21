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
      console.warn('⚠️ Concentration by Role hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Concentration by Role hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Concentration by Role hook: Starting data load...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchConcentrationData(currency)
      setConcentrationData(result)
      console.log('✅ Concentration by Role hook: Data set successfully')
    } catch (err) {
      console.error('❌ Concentration by Role hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Concentration by Role hook: Load completed')
    }
  }, [context.accessToken, currency, fetchConcentrationData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    concentrationData,
    isLoading,
    error,
    refetch: loadData
  }
}
