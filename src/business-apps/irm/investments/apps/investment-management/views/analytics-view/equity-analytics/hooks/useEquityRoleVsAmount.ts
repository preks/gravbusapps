import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetRoleVsAmountData, type RoleVsAmountData } from '../queries/EquityRoleVsAmountQuery'

interface UseEquityRoleVsAmountResult {
  roleVsAmountData: RoleVsAmountData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Independent hook for Role vs Amount chart data
 * Only refetches when its own currency changes
 */
export const useEquityRoleVsAmount = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityRoleVsAmountResult => {
  const { fetchRoleVsAmountData } = useGetRoleVsAmountData(context)
  const [roleVsAmountData, setRoleVsAmountData] = useState<RoleVsAmountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('⚠️ Role vs Amount hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Role vs Amount hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Role vs Amount hook: Starting data load...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchRoleVsAmountData(currency)
      setRoleVsAmountData(result)
      console.log('✅ Role vs Amount hook: Data set successfully')
    } catch (err) {
      console.error('❌ Role vs Amount hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Role vs Amount hook: Load completed')
    }
  }, [context.accessToken, currency, fetchRoleVsAmountData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    roleVsAmountData,
    isLoading,
    error,
    refetch: loadData
  }
}
