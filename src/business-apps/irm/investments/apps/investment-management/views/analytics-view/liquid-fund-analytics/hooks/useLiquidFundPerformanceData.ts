import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetLiquidFundPerformanceData,
  type InterestRateCorrelationData,
  type PerformanceByTypeData
} from '../queries/LiquidFundPerformanceDataQuery'

export interface LiquidFundCorrelationDataIntegration {
  correlationData: InterestRateCorrelationData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export interface LiquidFundPerformanceByTypeIntegration {
  performanceByTypeData: PerformanceByTypeData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Liquid Fund correlation data (Interest Rate vs Amount)
 * Only refetches when correlation currency changes
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter for correlation chart
 * @returns Correlation data with loading/error states
 */
export const useLiquidFundCorrelationData = (
  context: BusinessAppContextProps,
  currency: string
): LiquidFundCorrelationDataIntegration => {
  const { fetchCorrelationData } = useGetLiquidFundPerformanceData(context)
  const [correlationData, setCorrelationData] = useState<InterestRateCorrelationData[]>([])
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
      const data = await fetchCorrelationData(currency)

      setCorrelationData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchCorrelationData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    correlationData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}

/**
 * Hook that fetches Liquid Fund performance by type data
 * Only refetches when performance currency changes
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter for performance chart
 * @returns Performance by type data with loading/error states
 */
export const useLiquidFundPerformanceByType = (
  context: BusinessAppContextProps,
  currency: string
): LiquidFundPerformanceByTypeIntegration => {
  const { fetchPerformanceByTypeData } = useGetLiquidFundPerformanceData(context)
  const [performanceByTypeData, setPerformanceByTypeData] = useState<PerformanceByTypeData[]>([])
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
      const data = await fetchPerformanceByTypeData(currency)

      setPerformanceByTypeData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, fetchPerformanceByTypeData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    performanceByTypeData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
