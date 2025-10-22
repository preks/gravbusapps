import { useState, useCallback } from 'react'
import { SelectOption } from '../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface RegionsHookParams {
  accessToken: string
}

export const useRegions = ({ accessToken }: RegionsHookParams) => {
  const [regions, setRegions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  // Try to fetch regions from catalog based on country
  const fetchRegionsByCountry = useCallback(
    async (countryId: string): Promise<SelectOption[]> => {
      if (!countryId) {
        setRegions([])
        return []
      }

      setLoading(true)
      setError(null)

      try {
        // First try to find regions as child entries of the country
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Region',
            version: 'v1'
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Filter regions by parent country if available
        let regionData = response.data || []
        if (response.data && response.data.length > 0) {
          // Check if any entries have parentEntryId matching the country
          regionData = response.data.filter((entry: any) => entry.parentEntryId === countryId)
        }

        const mappedRegions: SelectOption[] = regionData.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.label || entry.name || 'Unknown',
          label: entry.value || entry.label || entry.name || 'Unknown',
          value: entry.id
        }))

        setRegions(mappedRegions)
        return mappedRegions
      } catch {
        // If catalog doesn't exist or fails, fall back to basic region handling
        console.warn('Region catalog not available, using manual input')
        setRegions([])
        return []
      } finally {
        setLoading(false)
      }
    },
    [catalogClient]
  )

  // Clear regions when no country is selected
  const clearRegions = useCallback(() => {
    setRegions([])
    setError(null)
  }, [])

  return {
    regions,
    loading,
    error,
    fetchRegionsByCountry,
    clearRegions
  }
}
