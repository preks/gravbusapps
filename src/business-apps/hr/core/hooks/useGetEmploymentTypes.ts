'use client'

import { useEffect, useState } from 'react'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { parseEmploymentMetadata } from '@/business-apps/mdm/apps/employment-data/utils/catalogEntryMetadata'

export interface EmploymentTypeOption {
  id: string
  name: string
}

/**
 * Custom hook to fetch employment types with a search filter and pagination (limit 5).
 * Uses the catalog-management API utilities for consistency and CORS compliance.
 * @param searchRegex Search regex string for filtering employment types.
 * @param offset Pagination offset
 */
export function useGetEmploymentTypes(accessToken: string, searchRegex: string, offset: number = 0) {
  const userLocale = useUserLocale() ?? 'en-US'
  const [types, setTypes] = useState<EmploymentTypeOption[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const client = useCatalogManagerClient(accessToken)

  useEffect(() => {
    setError(null)

    client
      .getCatalogEntriesList(
        {
          catalogIdentifier: 'EmploymentType',
          version: 'v1'
        },
        {
          limit: 5,
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

        const typesArr: EmploymentTypeOption[] = entries
          .filter((entry: any) => entry && (entry.id || entry._id))
          .filter((entry: any) => !parseEmploymentMetadata(entry.additionalValue2).is_deleted)
          .map((entry: any) => ({
            id: entry.id || entry._id || '',
            name: entry.value || entry.name || entry.label || entry.id || ''
          }))

        setTypes(typesArr)
        setHasMore(entries.length === 5)
      })
      .catch((err: any) => {
        console.error('Error fetching employment types:', err)
        setError(err)
        setTypes([])
        setHasMore(false)
      })
  }, [searchRegex, offset, userLocale, client])

  return { types, loading: false, error, hasMore }
}
