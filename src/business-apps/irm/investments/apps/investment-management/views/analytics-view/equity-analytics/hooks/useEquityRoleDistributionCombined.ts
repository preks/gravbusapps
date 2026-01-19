import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityRoleDistributionCombined,
  type RoleDistributionData,
  type RoleAmountDistributionData
} from '../queries/EquityRoleDistributionCombinedQuery'

export interface EquityRoleDistributionCombinedIntegration {
  roleCountDistribution: RoleDistributionData[]
  roleAmountDistribution: RoleAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Combined hook that fetches BOTH role count and amount distribution
 * This avoids duplicate GetDistinctRoles queries by fetching distinct roles once
 *
 * @param context - Business app context with access token
 * @param countCurrency - Currency for count distribution (supports 'All')
 * @param amountCurrency - Currency for amount distribution (specific currency only)
 * @returns Combined role distribution data with loading/error states
 */
export const useEquityRoleDistributionCombined = (
  context: BusinessAppContextProps,
  countCurrency?: string,
  amountCurrency?: string
): EquityRoleDistributionCombinedIntegration => {
  const { fetchCombinedRoleDistribution } = useGetEquityRoleDistributionCombined(context)
  const [roleCountDistribution, setRoleCountDistribution] = useState<RoleDistributionData[]>([])
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
      const { countData, amountData } = await fetchCombinedRoleDistribution(countCurrency, amountCurrency)
      setRoleCountDistribution(countData)
      setRoleAmountDistribution(amountData)
    } catch (err) {
      console.error('Error loading combined equity role distribution:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, countCurrency, amountCurrency, fetchCombinedRoleDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    roleCountDistribution,
    roleAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
