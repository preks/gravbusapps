import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityRoleCountDistribution,
  type RoleCountDistributionData
} from '../queries/EquityRoleCountDistributionQuery'

export interface EquityRoleCountDistributionIntegration {
  roleCountDistribution: RoleCountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches role count distribution independently
 * Supports "All" option
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter (supports 'All')
 * @returns Role count distribution data with loading/error states
 */
export const useEquityRoleCountDistribution = (
  context: BusinessAppContextProps,
  currency?: string
): EquityRoleCountDistributionIntegration => {
  const { fetchRoleCountDistribution } = useGetEquityRoleCountDistribution(context)
  const [roleCountDistribution, setRoleCountDistribution] = useState<RoleCountDistributionData[]>([])
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
      const countData = await fetchRoleCountDistribution(currency)
      setRoleCountDistribution(countData)
    } catch (err) {
      console.error('❌ Error loading role count distribution:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchRoleCountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    roleCountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
