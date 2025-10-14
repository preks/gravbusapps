import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetRealEstateKPIs, RealEstateKPIData, RealEstateKPIComparison } from '../queries/RealEstateKPIQueries'

export interface RealEstateKPIIntegration {
  current: RealEstateKPIData
  previous: RealEstateKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useRealEstateKPIIntegration = (context: BusinessAppContextProps): RealEstateKPIIntegration => {
  const [current, setCurrent] = useState<RealEstateKPIData>({
    totalInvestments: 0,
    totalAmountInvested: 0,
    totalMarketValue: 0,
    averageOccupancyRate: 0
  })

  const [previous, setPrevious] = useState<RealEstateKPIData>({
    totalInvestments: 0,
    totalAmountInvested: 0,
    totalMarketValue: 0,
    averageOccupancyRate: 0
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchRealEstateKPIs } = useGetRealEstateKPIs(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data: RealEstateKPIComparison = await fetchRealEstateKPIs()
      setCurrent(data.current)
      setPrevious(data.previous)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading real estate KPI data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchRealEstateKPIs])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    current,
    previous,
    isLoading,
    error,
    refetch: loadData
  }
}
