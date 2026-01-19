import { useState, useEffect, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'

// Extend from the base CatalogEntry type
type TaxBracketEntry = CatalogEntry & {
  // We ensure all fields are required for our specific use case
  additionalValue1: string
}

interface UseTaxBracketCatalogResult {
  taxBracketEntries: TaxBracketEntry[]
  loading: boolean
  error: Error | null
  getTaxBracketValueById: (id: string) => string
}

/**
 * Custom hook to fetch and manage tax bracket catalog entries
 * @param accessToken User access token
 * @returns Tax bracket catalog data and utilities
 */
export const useTaxBracketCatalog = (accessToken: string): UseTaxBracketCatalogResult => {
  const [taxBracketEntries, setTaxBracketEntries] = useState<TaxBracketEntry[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  // Get catalog manager client instance
  const catalogClient = useCatalogManagerClient(accessToken)

  // Fetch tax bracket catalog entries
  useEffect(() => {
    const fetchTaxBrackets = async () => {
      if (!accessToken) return

      try {
        setLoading(true)
        setError(null)

        // Fetch tax bracket catalog entries
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'TaxBracket',
            version: 'v1'
          },
          {
            limit: 50,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Set tax bracket entries from the response with type assertion
        setTaxBracketEntries((response.data || []) as unknown as TaxBracketEntry[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch tax bracket catalog'))
        console.error('Error fetching tax bracket catalog:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTaxBrackets()
  }, [accessToken, catalogClient])

  // Memoized function to get tax bracket value by ID
  const getTaxBracketValueById = useMemo(() => {
    return (id: string): string => {
      if (!id) return ''

      // Find matching tax bracket entry by ID
      const matchingEntry = taxBracketEntries.find(entry => entry.id === id)

      // Return the human-readable value or the original ID if no match found
      return matchingEntry?.value || id
    }
  }, [taxBracketEntries])

  return {
    taxBracketEntries,
    loading,
    error,
    getTaxBracketValueById
  }
}
