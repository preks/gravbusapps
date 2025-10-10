import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface AnnualRevenueOption {
  id: string
  name: string
  code: string
}

export interface UseGetAnnualRevenueReturn {
  revenueOptions: AnnualRevenueOption[]
  isLoading: boolean
  error: Error | null
}

const GET_ANNUAL_REVENUE_QUERY = `
  query GetAnnualRevenue($search: String) {
    CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "RevenueSize" } }
        _and: [
          { 
            _or: [
              { value: { _ilike: $search } }
              { code: { _ilike: $search } }
            ]
          }
        ]
      }
      orderBy: [{ code: ASC_NULLS_LAST }, { value: ASC_NULLS_LAST }]
      limit: 100
    ) {
      id
      value
      code
    }
  }
`

export const useGetAnnualRevenue = (
  context: BusinessAppContextProps,
  search: string = ''
): UseGetAnnualRevenueReturn => {
  const [revenueOptions, setRevenueOptions] = useState<AnnualRevenueOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAnnualRevenue = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchPattern = search ? `%${search}%` : '%'
      const result = await graphqlClient.request(GET_ANNUAL_REVENUE_QUERY, {
        search: searchPattern
      })

      if (result?.CatalogEntry) {
        const options = result.CatalogEntry.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || 'Unknown',
          code: entry.code || ''
        }))
        setRevenueOptions(options)
      } else {
        setRevenueOptions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch annual revenue options'))
      console.error('Error fetching annual revenue options:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, graphqlClient])

  useEffect(() => {
    fetchAnnualRevenue()
  }, [fetchAnnualRevenue])

  return {
    revenueOptions,
    isLoading,
    error
  }
}
