import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface AcademicTitleOption {
  id: string
  value: string
  label: string
  name: string
}

export const useAcademicTitles = (accessToken: string) => {
  const [academicTitleOptions, setAcademicTitleOptions] = useState<AcademicTitleOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchAcademicTitles = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AcademicTitle',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const options = response.data.map(entry => ({
        id: entry.id,
        value: entry.value,
        label: entry.value,
        name: entry.value
      }))

      setAcademicTitleOptions(options)
    } catch (err) {
      console.error('Error fetching academic titles:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch academic titles')
      // Fallback to empty array on error
      setAcademicTitleOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, accessToken])

  useEffect(() => {
    fetchAcademicTitles()
  }, [fetchAcademicTitles])

  return {
    academicTitleOptions,
    isLoading,
    error,
    refetch: fetchAcademicTitles
  }
}
