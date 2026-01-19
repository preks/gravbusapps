'use client'

import { useEffect, useState } from 'react'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface ContractTypeFilterOption {
  id: string
  name: string
}

/**
 * Custom hook to fetch contract types for filter options
 * @param accessToken User access token
 * @param search Search string for filtering
 * @param offset Pagination offset
 */
export function useContractTypeFilters(accessToken: string, search: string = '', offset: number = 0) {
  const userLocale = useUserLocale() ?? 'en-US'
  const [types, setTypes] = useState<ContractTypeFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const client = useCatalogManagerClient(accessToken)

  useEffect(() => {
    if (!client) return

    setLoading(true)
    setError(null)

    client
      .getCatalogEntriesList(
        {
          catalogIdentifier: 'ContractType',
          version: 'v1'
        },
        {
          limit: 5,
          offset,
          returnTotalRecords: true,
          localeCode: userLocale,
          ...(search ? { searchCriteria: search } : {})
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

        const typesArr = entries
          .filter((entry: any) => entry && (entry.id || entry._id))
          .map((entry: any) => ({
            id: entry.id || entry._id || '',
            name: entry.value || entry.name || entry.label || entry.id || ''
          }))

        setTypes(typesArr)
      })
      .catch((err: any) => {
        console.error('Error fetching contract types:', err)
        setError(err)
        setTypes([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [search, offset, userLocale, client])

  return { types, loading, error }
}
