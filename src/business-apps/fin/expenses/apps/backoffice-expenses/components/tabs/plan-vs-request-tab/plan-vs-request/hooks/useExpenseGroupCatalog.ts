import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CatalogEntry {
  id: string
  value: string
  label: string
  name: string
  code?: string
}

export const useExpenseGroupCatalog = (accessToken: string | null | undefined) => {
  const [expenseGroups, setExpenseGroups] = useState<CatalogEntry[]>([])
  const [loadingCatalogData, setLoadingCatalogData] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Get the catalog client using the project's standard hook
  const catalogClient = useCatalogManagerClient(accessToken || '')

  const refetch = useCallback(async () => {
    if (!accessToken) {
      return
    }
    if (!catalogClient) {
      return
    }

    try {
      setLoadingCatalogData(true)
      setError(null)

      const fetchAllCatalogEntries = async (catalogIdentifier: string, version: string = 'v1') => {
        let allEntries: any[] = []
        let offset = 0
        const limit = 20
        let hasMore = true

        while (hasMore) {
          const response = await catalogClient.getCatalogEntriesList(
            {
              catalogIdentifier,
              version
            },
            {
              limit,
              offset,
              returnTotalRecords: true,
              includeChildCatalogEntries: true
            }
          )

          if (response.data && response.data.length > 0) {
            allEntries = [...allEntries, ...response.data]
            offset += limit

            if (response.data.length < limit) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        return allEntries
          .map((entry: any) => ({
            id: entry.id,
            value: entry.value,
            label: entry.value,
            name: entry.value,
            code: entry.code
          }))
          .sort((a, b) => a.value.localeCompare(b.value))
      }

      const expenseGroupData = await fetchAllCatalogEntries('ExpenseGroup')
      setExpenseGroups(expenseGroupData)
    } catch (err) {
      console.error('Error fetching expense group catalog data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load expense group data'
      setError(errorMessage)
    } finally {
      setLoadingCatalogData(false)
    }
  }, [accessToken, catalogClient])

  useEffect(() => {
    if (expenseGroups.length === 0) {
      refetch()
    }
  }, [refetch, expenseGroups.length])

  return {
    options: expenseGroups,
    isLoading: loadingCatalogData,
    error,
    refetch
  }
}
