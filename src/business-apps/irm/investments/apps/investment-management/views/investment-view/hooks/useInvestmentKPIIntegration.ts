import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentKPIs, InvestmentKPIData, InvestmentKPIComparison } from '../queries/InvestmentKPIQueries'

export interface InvestmentKPIIntegration {
  current: InvestmentKPIData
  previous: InvestmentKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useInvestmentKPIIntegration = (
  context: BusinessAppContextProps,
  currencyCode?: string
): InvestmentKPIIntegration => {
  const [current, setCurrent] = useState<InvestmentKPIData>({
    totalInvestments: 0,
    totalInvested: 0,
    averageStakePercentage: 0,
    totalMarketValue: 0
  })

  const [previous, setPrevious] = useState<InvestmentKPIData>({
    totalInvestments: 0,
    totalInvested: 0,
    averageStakePercentage: 0,
    totalMarketValue: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentKPIs } = useGetInvestmentKPIs(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data: InvestmentKPIComparison = await fetchInvestmentKPIs(currencyCode)
      setCurrent(data.current)
      setPrevious(data.previous)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading investment KPI data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, currencyCode, fetchInvestmentKPIs])

  useEffect(() => {
    loadData()
  }, [context.accessToken, currencyCode]) // React to currency changes

  return {
    current,
    previous,
    isLoading,
    error,
    refetch: loadData
  }
}
