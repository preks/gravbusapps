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
      return
    }

    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchRoleVsAmountData(currency)
      setRoleVsAmountData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchRoleVsAmountData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    roleVsAmountData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
