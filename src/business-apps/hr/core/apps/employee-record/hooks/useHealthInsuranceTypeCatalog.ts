import { useState, useEffect, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'

// Extend from the base CatalogEntry type
type HealthInsuranceTypeEntry = CatalogEntry & {
  // We ensure all fields are required for our specific use case
  additionalValue1: string
}

interface UseHealthInsuranceTypeCatalogResult {
  healthInsuranceTypeEntries: HealthInsuranceTypeEntry[]
  loading: boolean
  error: Error | null
  getHealthInsuranceTypeValueById: (id: string) => string
}

/**
 * Custom hook to fetch and manage health insurance type catalog entries
 * @param accessToken User access token
 * @returns Health insurance type catalog data and utilities
 */
export const useHealthInsuranceTypeCatalog = (accessToken: string): UseHealthInsuranceTypeCatalogResult => {
  const [healthInsuranceTypeEntries, setHealthInsuranceTypeEntries] = useState<HealthInsuranceTypeEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get catalog manager client instance
  const catalogClient = useCatalogManagerClient(accessToken)

  // Fetch health insurance type catalog entries
  useEffect(() => {
    const fetchHealthInsuranceTypes = async () => {
      if (!accessToken) return

      try {
        setLoading(true)
        setError(null)

        // Fetch health insurance type catalog entries
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'HealthInsuranceType',
            version: 'v1'
          },
          {
            limit: 50,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Set health insurance type entries from the response with type assertion
        setHealthInsuranceTypeEntries((response.data || []) as unknown as HealthInsuranceTypeEntry[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch health insurance type catalog'))
        console.error('Error fetching health insurance type catalog:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHealthInsuranceTypes()
  }, [accessToken, catalogClient])

  // Memoized function to get health insurance type value by ID
  const getHealthInsuranceTypeValueById = useMemo(() => {
    return (id: string): string => {
      if (!id) return ''

      // Find matching health insurance type entry by ID
      const matchingEntry = healthInsuranceTypeEntries.find(entry => entry.id === id)

      // Return the human-readable value or the original ID if no match found
      return matchingEntry?.value || id
    }
  }, [healthInsuranceTypeEntries])

  return {
    healthInsuranceTypeEntries,
    loading,
    error,
    getHealthInsuranceTypeValueById
  }
}
