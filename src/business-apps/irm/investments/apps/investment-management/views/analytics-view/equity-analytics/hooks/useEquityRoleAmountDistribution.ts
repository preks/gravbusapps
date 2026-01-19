import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityRoleAmountDistribution,
  type RoleAmountDistributionData
} from '../queries/EquityRoleAmountDistributionQuery'

export interface EquityRoleAmountDistributionIntegration {
  roleAmountDistribution: RoleAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches role amount distribution independently
 * Requires specific currency
 *
 * @param context - Business app context with access token
 * @param currency - Specific currency code (required)
 * @returns Role amount distribution data with loading/error states
 */
export const useEquityRoleAmountDistribution = (
  context: BusinessAppContextProps,
  currency: string
): EquityRoleAmountDistributionIntegration => {
  const { fetchRoleAmountDistribution } = useGetEquityRoleAmountDistribution(context)
  const [roleAmountDistribution, setRoleAmountDistribution] = useState<RoleAmountDistributionData[]>([])
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
      const amountData = await fetchRoleAmountDistribution(currency)
      setRoleAmountDistribution(amountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchRoleAmountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    roleAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
