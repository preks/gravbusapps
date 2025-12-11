import { useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
}

export interface SearchableCatalogHookParams {
  catalogIdentifier: string
  version: string
  businessAppContext: BusinessAppContextProps
  whereConditions?: Record<string, any>
}

export interface SearchableCatalogHookResult {
  options: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalRecords: number
  search: (searchTerm: string) => void
  loadMore: () => void
  initialize: () => void
}

export const useSearchableCatalog = ({
  catalogIdentifier,
  version,
  businessAppContext,
  whereConditions = {}
}: SearchableCatalogHookParams): SearchableCatalogHookResult => {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')

  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken)

  const pageSize = 100

  const fetchCatalogEntries = useCallback(
    async (isLoadMore: boolean = false, currentSearchTerm: string = '') => {
      if (!businessAppContext.accessToken) return

      setLoading(true)
      setError(null)

      try {
        const currentOffset = isLoadMore ? offset : 0

        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier,
            version
          },
          {
            limit: pageSize,
            offset: currentOffset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(currentSearchTerm && { searchCriteria: currentSearchTerm }),
            ...whereConditions
          }
        )

        if (response?.data) {
          // Filter investment groups to only include entries with prospectEnabled = true
          const filteredData =
            catalogIdentifier === 'InvestmentGroup'
              ? response.data.filter((item: any) => item.objectValue?.prospectEnabled === true)
              : response.data

          const newOptions: SelectOption[] = filteredData.map((item: any) => ({
            id: item.id,
            value: item.id,
            label: item.value || item.name || item.code,
            name: item.name || item.value || item.code
          }))

          setOptions(prev => (isLoadMore ? [...prev, ...newOptions] : newOptions))
          setTotalRecords(response.paging?.totalRecords || newOptions.length)

          const newOffset = currentOffset + newOptions.length
          setOffset(newOffset)
          setHasMore(newOffset < (response.paging?.totalRecords || newOptions.length))
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to fetch ${catalogIdentifier}`
        setError(errorMessage)
        console.error(`❌ Error fetching ${catalogIdentifier}:`, err)
      } finally {
        setLoading(false)
      }
    },
    [catalogClient, catalogIdentifier, version, businessAppContext.accessToken, offset, whereConditions]
  )

  const initialize = useCallback(() => {
    setOptions([])
    setOffset(0)
    setHasMore(true)
    fetchCatalogEntries(false, searchTerm)
  }, [fetchCatalogEntries, searchTerm])

  const search = useCallback(
    (newSearchTerm: string) => {
      setSearchTerm(newSearchTerm)
      setOptions([])
      setOffset(0)
      setHasMore(true)
      fetchCatalogEntries(false, newSearchTerm)
    },
    [fetchCatalogEntries]
  )

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchCatalogEntries(true, searchTerm)
    }
  }, [fetchCatalogEntries, loading, hasMore, searchTerm])

  return {
    options,
    loading,
    error,
    hasMore,
    totalRecords,
    search,
    loadMore,
    initialize
  }
}
