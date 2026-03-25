import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { isContractTypeMarkedDeleted } from '@/business-apps/mdm/apps/employment-data/utils/catalogEntryMetadata'
import { SelectOption } from '../types'

export interface ContractTypeData {
  id: string
  name: string
  value: string
}

export const CONTRACT_TYPE_CATALOG = 'ContractType'
export const CONTRACT_TYPE_VERSION = 'v1'

export const useContractTypes = (accessToken: string) => {
  const [contractTypes, setContractTypes] = useState<SelectOption[]>([])
  const [allContractTypes, setAllContractTypes] = useState<ContractTypeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const catalogClient = useCatalogManagerClient(accessToken)

  const transformContractType = (catalogEntry: any): ContractTypeData => {
    return {
      id: catalogEntry.id,
      name: catalogEntry.value || catalogEntry.code || 'Unknown',
      value: catalogEntry.value || catalogEntry.code || 'Unknown'
    }
  }

  const fetchContractTypes = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = 20, offset = 0, search = '', reset = false } = params

      if (reset) {
        setContractTypes([])
        setAllContractTypes([])
      }

      setLoading(true)
      setError(null)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: CONTRACT_TYPE_CATALOG,
            version: CONTRACT_TYPE_VERSION
          },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(search && { searchCriteria: search })
          }
        )

        const transformedData = response.data
          .filter((entry: any) => !isContractTypeMarkedDeleted(entry))
          .map(transformContractType)
        const selectOptions: SelectOption[] = transformedData.map(type => ({
          id: type.id,
          name: type.name,
          label: type.name,
          value: type.id
        }))

        if (reset || offset === 0) {
          setContractTypes(selectOptions)
          setAllContractTypes(transformedData)
        } else {
          setContractTypes(prev => [...prev, ...selectOptions])
          setAllContractTypes(prev => [...prev, ...transformedData])
        }

        setHasMore(response.data.length === limit)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contract types'
        setError(errorMessage)
        console.error('Error fetching contract types:', err)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, catalogClient]
  )

  const searchContractTypes = useCallback(
    (search: string) => {
      setSearchTerm(search)
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

  // Load initial data
  useEffect(() => {
    if (accessToken) {
      fetchContractTypes({ reset: true })
    }
  }, [accessToken, fetchContractTypes])

  return {
    contractTypes,
    allContractTypes,
    loading,
    error,
    hasMore,
    searchContractTypes,
    loadMoreContractTypes,
    refetch: () => fetchContractTypes({ reset: true })
  }
}
