import { useState, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'

interface UseSalesActivityTypesResult {
  activityTypes: CatalogEntry[]
  loading: boolean
  error: Error | null
}

/**
 * Hook to fetch sales activity types from the catalog
 */
export function useSalesActivityTypes(accessToken: string): UseSalesActivityTypesResult {
  const [activityTypes, setActivityTypes] = useState<CatalogEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get catalog manager client
  const catalogClient = useCatalogManagerClient(accessToken)

  useEffect(() => {
    const fetchActivityTypes = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch sales activity types from catalog
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'SalesActivityType',
            version: 'v1'
          },
          {
            returnTotalRecords: true
          }
        )

        if (response && response.data) {
          setActivityTypes(response.data)
        }
      } catch (err) {
        console.error('Error fetching sales activity types:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch sales activity types'))
      } finally {
        setLoading(false)
      }
    }

    fetchActivityTypes()
  }, [catalogClient, accessToken])

  return {
    activityTypes,
    loading,
    error
  }
}
