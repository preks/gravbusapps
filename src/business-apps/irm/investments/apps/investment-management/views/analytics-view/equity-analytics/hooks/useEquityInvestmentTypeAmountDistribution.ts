import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetEquityInvestmentTypeAmountDistribution,
  type InvestmentTypeAmountDistributionData
} from '../queries/EquityInvestmentTypeAmountDistributionQuery'

interface UseEquityInvestmentTypeAmountDistributionResult {
  investmentTypesAmount: InvestmentTypeAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * React hook for managing investment type amount distribution state
 * Uses shared distinct investment types query to avoid duplication
 */
export const useEquityInvestmentTypeAmountDistribution = (
  context: BusinessAppContextProps,
  currency: string
): UseEquityInvestmentTypeAmountDistributionResult => {
  const [investmentTypesAmount, setInvestmentTypesAmount] = useState<InvestmentTypeAmountDistributionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentTypeAmountDistribution } = useGetEquityInvestmentTypeAmountDistribution(context)

  const loadData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const amountData = await fetchInvestmentTypeAmountDistribution(currency)
      setInvestmentTypesAmount(amountData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment type amount distribution'
      setError(errorMessage)
      console.error('Error in useEquityInvestmentTypeAmountDistribution:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, currency, fetchInvestmentTypeAmountDistribution])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    investmentTypesAmount,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
