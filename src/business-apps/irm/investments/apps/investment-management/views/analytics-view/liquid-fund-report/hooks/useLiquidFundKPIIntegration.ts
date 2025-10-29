import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetLiquidFundKPIs, LiquidFundKPIData, LiquidFundKPIComparison } from '../queries/LiquidFundKPIQueries'

export interface LiquidFundKPIIntegration {
  current: LiquidFundKPIData
  previous: LiquidFundKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useLiquidFundKPIIntegration = (context: BusinessAppContextProps): LiquidFundKPIIntegration => {
  const [current, setCurrent] = useState<LiquidFundKPIData>({
    totalInvestments: 0,
    totalAmountInvested: 0,
    totalMarketValue: 0,
    averageInvestmentValue: 0,
    averageMarketValue: 0
  })

  const [previous, setPrevious] = useState<LiquidFundKPIData>({
    totalInvestments: 0,
    totalAmountInvested: 0,
    totalMarketValue: 0,
    averageInvestmentValue: 0,
    averageMarketValue: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchLiquidFundKPIs } = useGetLiquidFundKPIs(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data: LiquidFundKPIComparison = await fetchLiquidFundKPIs()
      setCurrent(data.current)
      setPrevious(data.previous)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading liquid fund KPI data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchLiquidFundKPIs])

  useEffect(() => {
    loadData()
  }, [context.accessToken]) // Only depend on accessToken, not loadData

  return {
    current,
    previous,
    isLoading,
    error,
    refetch: loadData
  }
}
