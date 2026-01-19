import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityInvestmentTypeCountDistribution,
  type InvestmentTypeCountDistributionData
} from '../queries/EquityInvestmentTypeCountDistributionQuery'

interface UseEquityInvestmentTypeCountDistributionResult {
  investmentTypesCount: InvestmentTypeCountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * React hook for managing investment type count distribution state
 * Uses shared distinct investment types query to avoid duplication
 */
export const useEquityInvestmentTypeCountDistribution = (
  context: BusinessAppContextProps,
  currency?: string
): UseEquityInvestmentTypeCountDistributionResult => {
  const [investmentTypesCount, setInvestmentTypesCount] = useState<InvestmentTypeCountDistributionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentTypeCountDistribution } = useGetEquityInvestmentTypeCountDistribution(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const countData = await fetchInvestmentTypeCountDistribution(currency)
      setInvestmentTypesCount(countData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment type count distribution'
      setError(errorMessage)
      console.error('Error in useEquityInvestmentTypeCountDistribution:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, currency, fetchInvestmentTypeCountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    investmentTypesCount,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
