import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityTopCompanies, type TopCompanyData } from '../queries/EquityTopCompaniesQuery'

export interface EquityTopCompaniesIntegration {
  topCompanies: TopCompanyData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch and manage top companies by valuation data
 */
export const useEquityTopCompanies = (
  context: BusinessAppContextProps,
  currency: string,
  limit: number = 10
): EquityTopCompaniesIntegration => {
  const { fetchTopCompanies } = useGetEquityTopCompanies(context)
  const [topCompanies, setTopCompanies] = useState<TopCompanyData[]>([])
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
      const { companies } = await fetchTopCompanies(currency, limit)
      setTopCompanies(companies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, limit, fetchTopCompanies])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    topCompanies,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
