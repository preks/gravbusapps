import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityPortfolioMatrix } from '../queries/EquityPortfolioMatrixQuery'
import dayjs from 'dayjs'

export interface PortfolioMatrixChartData {
  company: string
  duration: number // Years since acquisition
  moic: number // Multiple of Invested Capital
  investmentAmount: number // For tooltip and size calculation
  size: number // Scaled bubble size for visualization
}

interface UseEquityPortfolioMatrixResult {
  portfolioMatrixData: PortfolioMatrixChartData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * React hook for managing portfolio matrix chart data with server-side optimization
 * Calculates duration and MOIC client-side from optimized server data
 */
export const useEquityPortfolioMatrix = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityPortfolioMatrixResult => {
  const [portfolioMatrixData, setPortfolioMatrixData] = useState<PortfolioMatrixChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchPortfolioMatrix } = useGetEquityPortfolioMatrix(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch optimized data from server
      const dataPoints = await fetchPortfolioMatrix(currency)

      // Transform to chart format with client-side calculations
      const chartData: PortfolioMatrixChartData[] = dataPoints.map(point => {
        // Calculate duration in years
        const acquisitionDate = dayjs(point.acquisitionDate)
        const today = dayjs()
        const durationYears = today.diff(acquisitionDate, 'year', true)

        // Calculate MOIC (Multiple of Invested Capital)
        const moic = point.investmentMarketValue / point.totalInvestmentAmount

        // Calculate scaled bubble size (sqrt for better visual scaling)
        const size = Math.sqrt(point.totalInvestmentAmount / 1000000) * 100

        return {
          company: point.company,
          duration: Number(durationYears.toFixed(1)),
          moic: Number(moic.toFixed(2)),
          investmentAmount: point.totalInvestmentAmount,
          size
        }
      })

      setPortfolioMatrixData(chartData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch portfolio matrix data'
      setError(errorMessage)
      console.error('Error in useEquityPortfolioMatrix:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, currency, fetchPortfolioMatrix])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    portfolioMatrixData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
