import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetLiquidFundTypeDistribution,
  type LiquidFundTypeDistribution
} from '../queries/LiquidFundTypeDistributionQuery'

export interface LiquidFundTypeDistributionIntegration {
  countData: LiquidFundTypeDistribution[]
  amountData: LiquidFundTypeDistribution[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch and manage liquid fund type distribution data (count + amount)
 */
export const useLiquidFundTypeDistribution = (
  context: BusinessAppContextProps,
  currency: string | null
): LiquidFundTypeDistributionIntegration => {
  const { fetchLiquidFundTypeDistribution } = useGetLiquidFundTypeDistribution(context)
  const [countData, setCountData] = useState<LiquidFundTypeDistribution[]>([])
  const [amountData, setAmountData] = useState<LiquidFundTypeDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = useRef(false) // For query deduplication

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
      const result = await fetchLiquidFundTypeDistribution(currency)

      // Transform count data
      const transformedCountData: LiquidFundTypeDistribution[] = result.distinctTypes.map(type => ({
        type,
        count: result.countByType.get(type) || 0,
        totalAmount: 0 // Not used for count chart
      }))

      // Transform amount data
      const transformedAmountData: LiquidFundTypeDistribution[] = result.distinctTypes.map(type => ({
        type,
        count: 0, // Not used for amount chart
        totalAmount: result.amountByType.get(type) || 0
      }))

      setCountData(transformedCountData)
      setAmountData(transformedAmountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchLiquidFundTypeDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    countData,
    amountData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
