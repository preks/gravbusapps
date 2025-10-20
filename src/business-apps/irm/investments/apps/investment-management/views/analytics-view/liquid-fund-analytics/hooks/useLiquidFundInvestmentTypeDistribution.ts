import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetLiquidFundInvestmentTypeDistribution,
  type InvestmentTypeDistribution
} from '../queries/LiquidFundInvestmentTypeDistributionQuery'

export interface LiquidFundInvestmentTypeDistributionIntegration {
  countData: InvestmentTypeDistribution[]
  amountData: InvestmentTypeDistribution[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch and manage investment type distribution data (count + amount)
 */
export const useLiquidFundInvestmentTypeDistribution = (
  context: BusinessAppContextProps,
  currency: string | null
): LiquidFundInvestmentTypeDistributionIntegration => {
  const { fetchInvestmentTypeDistribution } = useGetLiquidFundInvestmentTypeDistribution(context)
  const [countData, setCountData] = useState<InvestmentTypeDistribution[]>([])
  const [amountData, setAmountData] = useState<InvestmentTypeDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false) // For query deduplication

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('⚠️ Investment type distribution hook: No access token available')
      return
    }

    if (isLoadingRef.current) {
      console.log('⏭️ Investment type distribution hook: Already loading, skipping duplicate request')
      return
    }

    console.log('🚀 Investment type distribution hook: Starting data load...', { currency })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentTypeDistribution(currency)

      // Transform count data
      const transformedCountData: InvestmentTypeDistribution[] = result.distinctTypes.map(type => ({
        type,
        count: result.countByType.get(type) || 0,
        totalAmount: 0 // Not used for count chart
      }))

      // Transform amount data
      const transformedAmountData: InvestmentTypeDistribution[] = result.distinctTypes.map(type => ({
        type,
        count: 0, // Not used for amount chart
        totalAmount: result.amountByType.get(type) || 0
      }))

      setCountData(transformedCountData)
      setAmountData(transformedAmountData)
      console.log('✅ Investment type distribution hook: Data set successfully', {
        countItems: transformedCountData.length,
        amountItems: transformedAmountData.length
      })
    } catch (err) {
      console.error('❌ Investment type distribution hook: Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      console.log('🏁 Investment type distribution hook: Load completed')
    }
  }, [context.accessToken, currency, fetchInvestmentTypeDistribution])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    countData,
    amountData,
    isLoading,
    error,
    refetch: loadData
  }
}
