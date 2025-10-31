import { useState, useEffect } from 'react'
import { OrgDirectoryClient } from './OrgDirectoryClient'

interface Company {
  id: string
  name: string
}

interface CostCenter {
  id: string
  name: string
}

interface UseBusinessDataResult {
  companies: Company[]
  costCenters: CostCenter[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching business data (companies and cost centers) via GraphQL
 * Uses the same queries as custom-flow-engine for consistency
 *
 * @param accessToken - Access token for authorization
 * @returns Object containing business data, loading state, error state, and refetch function
 */
export const useBusinessData = (accessToken: string): UseBusinessDataResult => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchBusinessData = async () => {
    if (!accessToken) {
      console.log('useBusinessData: No access token, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('useBusinessData: Fetching business data from GraphQL...')
      const client = new OrgDirectoryClient(accessToken)

      // Fetch companies and cost centers in parallel
      const [companiesData, costCentersData] = await Promise.all([client.getCompanies(), client.getCostCenters()])

      console.log(
        'useBusinessData: Successfully fetched',
        companiesData.length,
        'companies and',
        costCentersData.length,
        'cost centers'
      )
      setCompanies(companiesData)
      setCostCenters(costCentersData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch business data'
      console.error('useBusinessData: Error fetching business data:', errorMessage)
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBusinessData()
  }, [accessToken])

  return {
    companies,
    costCenters,
    loading,
    error,
    refetch: () => void fetchBusinessData()
  }
}
