import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'

/**
 * @interface LiquidFundDataIntegration
 * @description Lightweight data integration hook specifically for liquid fund analytics
 * Only fetches investments - accounts, contacts, opportunities, and leads are not needed
 */
export interface LiquidFundDataIntegration {
  /** Liquid fund investments */
  investments: Investment[]

  /** Loading state */
  isLoading: boolean

  /** Error message if fetch failed */
  error: string | null

  /** Function to manually refetch data */
  refetch: () => Promise<void>
}

/**
 * @hook useLiquidFundDataIntegration
 * @description Optimized data fetching hook for liquid fund analytics
 * Only fetches the investments query - removes unnecessary queries for:
 * - InvestmentAccounts (not used in analytics)
 * - InvestmentContacts (not used in analytics)
 * - InvestmentOpportunities (not used in analytics)
 * - InvestmentLeads (not used in analytics)
 *
 * @param {BusinessAppContextProps} context - Business application context
 * @returns {LiquidFundDataIntegration} Liquid fund data with loading and error states
 */
export const useLiquidFundDataIntegration = (context: BusinessAppContextProps): LiquidFundDataIntegration => {
  const { fetchInvestments } = useGetInvestments(context)

  const [investments, setInvestments] = useState<Investment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestments({ limit: 100 })
      setInvestments(result.Investment || [])
    } catch (err) {
      console.error('Error loading liquid fund investments:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [fetchInvestments])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      void loadData()
    }
  }, [context.accessToken, loadData])

  return {
    investments,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
