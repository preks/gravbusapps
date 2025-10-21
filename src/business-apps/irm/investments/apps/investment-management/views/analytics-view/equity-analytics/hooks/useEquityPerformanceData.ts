import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityPerformanceData,
  type StakeVsAmountData,
  type RoleVsAmountData,
  type ConcentrationData
} from '../queries/EquityPerformanceDataQuery'

export interface EquityPerformanceDataIntegration {
  stakeVsAmountData: StakeVsAmountData[]
  roleVsAmountData: RoleVsAmountData[]
  concentrationData: ConcentrationData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch and manage equity performance analysis data with independent currency filters
 */
export const useEquityPerformanceData = (
  context: BusinessAppContextProps,
  stakeAmountCurrency: string,
  roleAmountCurrency: string,
  concentrationCurrency: string
): EquityPerformanceDataIntegration => {
  const { fetchPerformanceData } = useGetEquityPerformanceData(context)
  const [stakeVsAmountData, setStakeVsAmountData] = useState<StakeVsAmountData[]>([])
  const [roleVsAmountData, setRoleVsAmountData] = useState<RoleVsAmountData[]>([])
  const [concentrationData, setConcentrationData] = useState<ConcentrationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false) // For query deduplication

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('⚠️ Performance data hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Performance data hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Performance data hook: Starting data load...', {
      stakeAmountCurrency,
      roleAmountCurrency,
      concentrationCurrency
    })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Fetch all three charts independently with their own currencies
      const [stakeResult, roleResult, concentrationResult] = await Promise.all([
        fetchPerformanceData(stakeAmountCurrency),
        fetchPerformanceData(roleAmountCurrency),
        fetchPerformanceData(concentrationCurrency)
      ])

      setStakeVsAmountData(stakeResult.stakeVsAmountData)
      setRoleVsAmountData(roleResult.roleVsAmountData)
      setConcentrationData(concentrationResult.concentrationData)
      console.log('✅ Performance data hook: Data set successfully')
    } catch (err) {
      console.error('❌ Performance data hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Performance data hook: Load completed')
    }
  }, [context.accessToken, stakeAmountCurrency, roleAmountCurrency, concentrationCurrency, fetchPerformanceData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    stakeVsAmountData,
    roleVsAmountData,
    concentrationData,
    isLoading,
    error,
    refetch: loadData
  }
}
