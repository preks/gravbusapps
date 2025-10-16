import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityKPIs, EquityKPIData, EquityKPIComparison } from '../queries/EquityKPIQueries'

export interface EquityKPIIntegration {
  current: EquityKPIData
  previous: EquityKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useEquityKPIIntegration = (context: BusinessAppContextProps, currency?: string): EquityKPIIntegration => {
  const [current, setCurrent] = useState<EquityKPIData>({
    totalInvestments: 0,
    totalAmountInvested: 0,
    portfolioMoic: 0,
    averageDuration: 0
  })

  const [previous, setPrevious] = useState<EquityKPIData>({
    totalInvestments: 0,
    totalAmountInvested: 0,
    portfolioMoic: 0,
    averageDuration: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchEquityKPIs } = useGetEquityKPIs(context, currency)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data: EquityKPIComparison = await fetchEquityKPIs()
      setCurrent(data.current)
      setPrevious(data.previous)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading equity KPI data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchEquityKPIs])

  useEffect(() => {
    loadData()
  }, [loadData, currency])

  return {
    current,
    previous,
    isLoading,
    error,
    refetch: loadData
  }
}
