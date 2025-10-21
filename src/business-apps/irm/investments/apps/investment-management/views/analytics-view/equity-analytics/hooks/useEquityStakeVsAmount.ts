import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetStakeVsAmountData, type StakeVsAmountData } from '../queries/EquityStakeVsAmountQuery'

interface UseEquityStakeVsAmountResult {
  stakeVsAmountData: StakeVsAmountData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Independent hook for Stake vs Amount chart data
 * Only refetches when its own currency changes
 */
export const useEquityStakeVsAmount = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityStakeVsAmountResult => {
  const { fetchStakeVsAmountData } = useGetStakeVsAmountData(context)
  const [stakeVsAmountData, setStakeVsAmountData] = useState<StakeVsAmountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('⚠️ Stake vs Amount hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Stake vs Amount hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Stake vs Amount hook: Starting data load...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchStakeVsAmountData(currency)
      setStakeVsAmountData(result)
      console.log('✅ Stake vs Amount hook: Data set successfully')
    } catch (err) {
      console.error('❌ Stake vs Amount hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Stake vs Amount hook: Load completed')
    }
  }, [context.accessToken, currency, fetchStakeVsAmountData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    stakeVsAmountData,
    isLoading,
    error,
    refetch: loadData
  }
}
