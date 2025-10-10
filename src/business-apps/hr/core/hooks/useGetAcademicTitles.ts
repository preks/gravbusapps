import { useState, useEffect } from 'react'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface AcademicTitleOption {
  id: string
  value: string
}

/**
 * Custom hook to fetch academic titles with a search filter and pagination.
 * Uses the catalog-management API utilities for consistency and CORS compliance.
 * @param accessToken Access token for API authorization
 * @param searchRegex Search regex string for filtering academic titles.
 * @param offset Pagination offset
 */
export function useGetAcademicTitles(accessToken: string, searchRegex: string = '', offset: number = 0) {
  const userLocale = useUserLocale() ?? 'en-US'
  const [titles, setTitles] = useState<AcademicTitleOption[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useCatalogManagerClient(accessToken)

  useEffect(() => {
    setLoading(true)
    setError(null)

    client
      .getCatalogEntriesList(
        {
          catalogIdentifier: 'AcademicTitle',
          version: 'v1'
        },
        {
          limit: 20, // Increased limit for academic titles as they're typically fewer
          offset,
          returnTotalRecords: true,
          localeCode: userLocale,
          ...(searchRegex ? { searchCriteria: searchRegex } : {})
        }
      )
      .then((response: any) => {
        // Handle different possible response structures
        let entries: any[] = []
        if (Array.isArray(response?.data?.data)) {
          entries = response.data.data
        } else if (Array.isArray(response?.data)) {
          entries = response.data
        } else if (Array.isArray(response)) {
          entries = response
        }

        const formattedTitles = entries.map(entry => ({
          id: entry.id,
          value: entry.value
        }))

        setTitles(formattedTitles)
        setHasMore(entries.length === 20) // If we got less than the limit, there are no more
        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('Error fetching academic titles:', err)
        setError(err)
        setLoading(false)
      })
  }, [accessToken, searchRegex, offset, userLocale, client])

  return { titles, hasMore, loading, error }
}
