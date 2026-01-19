import { useState, useEffect, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'

// Extend from the base CatalogEntry type
type ReligionEntry = CatalogEntry & {
  // We ensure all fields are required for our specific use case
  additionalValue1: string
}

interface UseReligionCatalogResult {
  religionEntries: ReligionEntry[]
  loading: boolean
  error: Error | null
  getReligionValueById: (id: string) => string
}

/**
 * Custom hook to fetch and manage religion catalog entries
 * @param accessToken User access token
 * @returns Religion catalog data and utilities
 */
export const useReligionCatalog = (accessToken: string): UseReligionCatalogResult => {
  const [religionEntries, setReligionEntries] = useState<ReligionEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get catalog manager client instance
  const catalogClient = useCatalogManagerClient(accessToken)

  // Fetch religion catalog entries
  useEffect(() => {
    const fetchReligions = async () => {
      if (!accessToken) return

      try {
        setLoading(true)
        setError(null)

        // Fetch religion catalog entries
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Religion',
            version: 'v1'
          },
          {
            limit: 50,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
            // Removed 'value' parameter since it's not part of GetCatalogsParams
          }
        )

        // Set religion entries from the response with type assertion
        // Since we know the Religion catalog entries match our ReligionEntry type
        setReligionEntries((response.data || []) as unknown as ReligionEntry[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch religion catalog'))
        console.error('Error fetching religion catalog:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReligions()
  }, [accessToken, catalogClient])

  // Memoized function to get religion value by ID
  const getReligionValueById = useMemo(() => {
    return (id: string): string => {
      if (!id) return ''

      // Find matching religion entry by ID
      const matchingEntry = religionEntries.find(entry => entry.id === id)

      // Return the human-readable value or the original ID if no match found
      return matchingEntry?.value || id
    }
  }, [religionEntries])

  return {
    religionEntries,
    loading,
    error,
    getReligionValueById
  }
}
