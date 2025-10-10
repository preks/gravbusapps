import { useState, useCallback, useEffect } from 'react'
import { SelectOption } from '../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface CountriesHookParams {
  accessToken: string
  pageSize?: number
}

interface CountriesState {
  options: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  currentSearch: string
  offset: number
}

export const useCountries = ({ accessToken, pageSize = 20 }: CountriesHookParams) => {
  const [state, setState] = useState<CountriesState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  })

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchCountries = useCallback(
    async (searchTerm: string = '', offset: number = 0, isLoadMore: boolean = false): Promise<void> => {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(isLoadMore ? {} : { options: [] })
      }))

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'Country',
            version: 'v1'
          },
          {
            limit: pageSize,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(searchTerm.trim() && { searchCriteria: searchTerm.trim() })
          }
        )

        const mappedOptions: SelectOption[] = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.label || entry.name || 'Unknown',
          label: entry.value || entry.label || entry.name || 'Unknown',
          value: entry.id
        }))

        const totalRecords = response.paging?.totalRecords || 0
        const newOffset = offset + pageSize
        const hasMoreRecords = newOffset < totalRecords

        setState(prev => ({
          ...prev,
          loading: false,
          options: isLoadMore ? [...prev.options, ...mappedOptions] : mappedOptions,
          hasMore: hasMoreRecords,
          currentSearch: searchTerm,
          offset: newOffset
        }))
      } catch (err) {
        console.error('Error fetching countries catalog:', err)
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        }))
      }
    },
    [catalogClient, pageSize]
  )

  const search = useCallback(
    (searchTerm: string) => {
      setState(prev => ({ ...prev, offset: 0 }))
      fetchCountries(searchTerm, 0, false)
    },
    [fetchCountries]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchCountries(state.currentSearch, state.offset, true)
    }
  }, [fetchCountries, state.hasMore, state.loading, state.currentSearch, state.offset])

  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: '',
      offset: 0
    })
  }, [])

  // Initial load
  const initialize = useCallback(() => {
    fetchCountries('', 0, false)
  }, [fetchCountries])

  // Auto-initialize when access token is available
  useEffect(() => {
    if (accessToken) {
      initialize()
    }
  }, [accessToken, initialize])

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    search,
    loadMore,
    reset,
    initialize
  }
}
