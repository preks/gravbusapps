import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchFilterGroups } from '@/common/network/graphql/queryHelpers'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface FilterGroupData {
  options: Array<{ id: string; label: string }>
  totalCount: number
}

export interface UseFilterGroupsResult {
  filterData: Record<string, FilterGroupData>
  isLoading: boolean
  error: Error | null
  search: (searchByKey: Record<string, string>) => Promise<void>
  refetch: () => Promise<void>
  getFilterOptions: (key: string) => Array<{ id: string; label: string }>
}

/**
 * Generic hook to fetch filter groups using descriptors
 * Replaces entity-specific filter hooks (useCustomerAccountFilters, etc.)
 */
export const useFilterGroups = (
  context: BusinessAppContextProps,
  entityName: string,
  descriptors: Descriptor[],
  options?: { limit?: number }
): UseFilterGroupsResult => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [filterData, setFilterData] = useState<Record<string, FilterGroupData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchFilters = useCallback(
    async (searchByKey?: Record<string, string>) => {
      if (!context.accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchFilterGroups({
          graphqlClient,
          entityName,
          descriptors,
          searchByKey,
          limit: options?.limit || 100
        })

        setFilterData(data)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        console.error('Error fetching filter groups:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, entityName, descriptors, options?.limit, context.accessToken]
  )

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  const search = useCallback(
    async (searchByKey: Record<string, string>) => {
      await fetchFilters(searchByKey)
    },
    [fetchFilters]
  )

  const refetch = useCallback(async () => {
    await fetchFilters()
  }, [fetchFilters])

  // Helper to get current options for a specific filter key
  const getFilterOptions = useCallback(
    (key: string): Array<{ id: string; label: string }> => {
      return filterData[key]?.options || []
    },
    [filterData]
  )

  return {
    filterData,
    isLoading,
    error,
    search,
    refetch,
    getFilterOptions
  }
}
