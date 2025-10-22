import { useState, useCallback, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { SelectOption } from '../types'

const CONTRACT_TYPE_CATALOG = 'ContractType'
const CATALOG_VERSION = 'v1'
const ITEMS_PER_PAGE = 20

export interface UseContractTypesReturn {
  contractTypes: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  searchContractTypes: (searchTerm?: string) => void
  loadMoreContractTypes: () => void
}

export const useContractTypes = (accessToken: string): UseContractTypesReturn => {
  const [contractTypes, setContractTypes] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchContractTypes = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = ITEMS_PER_PAGE, offset = 0, search = '', reset = false } = params

      if (reset) {
        setContractTypes([])
      }

      setLoading(true)
      setError(null)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: CONTRACT_TYPE_CATALOG,
            version: CATALOG_VERSION
          },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(search && { searchCriteria: search })
          }
        )

        const entries = response.data || []
        const selectOptions: SelectOption[] = entries.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || 'Unknown',
          label: entry.value || entry.code || 'Unknown',
          value: entry.id
        }))

        if (reset || offset === 0) {
          setContractTypes(selectOptions)
        } else {
          setContractTypes(prev => [...prev, ...selectOptions])
        }

        setHasMore(entries.length === limit)
        setInitialLoadDone(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contract types'
        setError(errorMessage)
        console.error('Error fetching contract types:', err)
        setInitialLoadDone(true)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, catalogClient]
  )

  const searchContractTypes = useCallback(
    (search?: string) => {
      setSearchTerm(search || '')
      fetchContractTypes({ search, reset: true })
    },
    [fetchContractTypes]
  )

  const loadMoreContractTypes = useCallback(() => {
    if (!loading && hasMore) {
      fetchContractTypes({
        search: searchTerm,
        offset: contractTypes.length
      })
    }
  }, [fetchContractTypes, loading, hasMore, searchTerm, contractTypes.length])

  // Initial load
  useEffect(() => {
    if (accessToken && !initialLoadDone && !loading) {
      fetchContractTypes({ reset: true })
    }
  }, [accessToken, fetchContractTypes, initialLoadDone, loading])

  return {
    contractTypes,
    loading,
    error,
    hasMore,
    searchContractTypes,
    loadMoreContractTypes
  }
}
