import { useState, useCallback, useRef } from 'react'
import { SelectOption } from '../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface SearchableCatalogHookParams {
  accessToken: string
  catalogIdentifier: string
  version?: string
  pageSize?: number
}

interface SearchableCatalogState {
  options: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  currentSearch: string
  offset: number
  displayCount: number // New field to track how many items to display
}

export const useSearchableCatalog = ({
  accessToken,
  catalogIdentifier,
  version = 'v1',
  pageSize = 100 // Increased from 20 to 100 for better UX
}: SearchableCatalogHookParams) => {
  // Use ref to track initialization to prevent re-initialization on re-renders
  const initializedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const [state, setState] = useState<SearchableCatalogState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: '',
    offset: 0,
    displayCount: 5 // Back to 5 as requested by user
  })

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchCatalogEntries = useCallback(
    async (searchTerm: string = '', offset: number = 0, isLoadMore: boolean = false): Promise<void> => {
      // Prevent concurrent requests
      if (isLoadingRef.current) {
        return
      }

      isLoadingRef.current = true
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(isLoadMore ? {} : { options: [] })
      }))

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier,
            version
          },
          {
            limit: pageSize,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(searchTerm.trim() && { value: searchTerm.trim() })
          }
        )

        const mappedOptions: SelectOption[] = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.label || entry.name || 'Unknown',
          label: entry.value || entry.label || entry.name || 'Unknown',
          value: entry.id
        }))

        const totalRecords = response.paging?.totalRecords || 0
        const currentOffset = offset + response.data.length // Update offset based on actual received items
        const hasMoreRecords = currentOffset < totalRecords

        setState(prev => ({
          ...prev,
          loading: false,
          options: isLoadMore ? [...prev.options, ...mappedOptions] : mappedOptions,
          hasMore: hasMoreRecords,
          currentSearch: searchTerm,
          offset: currentOffset // Store the current offset (where next request should start)
        }))

        initializedRef.current = true
      } catch (err) {
        console.error(`Error fetching ${catalogIdentifier} catalog:`, err)
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        }))
      } finally {
        isLoadingRef.current = false
      }
    },
    [catalogClient, catalogIdentifier, version, pageSize]
  )

  const search = useCallback(
    (searchTerm: string) => {
      setState(prev => ({ ...prev, offset: 0 }))
      fetchCatalogEntries(searchTerm, 0, false)
    },
    [fetchCatalogEntries]
  )

  const loadMore = useCallback(() => {
    if (isLoadingRef.current) {
      return
    }

    setState(prev => {
      if (prev.hasMore && !prev.loading) {
        fetchCatalogEntries(prev.currentSearch, prev.offset, true)
      }

      return prev
    })
  }, [fetchCatalogEntries])

  const reset = useCallback(() => {
    initializedRef.current = false
    isLoadingRef.current = false
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: '',
      offset: 0,
      displayCount: 5 // Back to 5 as requested
    })
  }, [])

  // Initial load - use ref to prevent multiple initializations
  const initialize = useCallback(() => {
    if (initializedRef.current || isLoadingRef.current) {
      return
    }

    fetchCatalogEntries('', 0, false)
  }, [fetchCatalogEntries])

  // Show more items from already fetched data
  const showMore = useCallback(() => {
    setState(prev => ({
      ...prev,
      displayCount: Math.min(prev.displayCount + 5, prev.options.length) // Back to 5 more items at a time
    }))
  }, [])

  // Check if we need to fetch more data from API
  const needsMoreData = state.displayCount >= state.options.length && state.hasMore

  // Get currently displayed options
  const displayedOptions = state.options.slice(0, state.displayCount)
  const hasMoreToShow = state.displayCount < state.options.length || state.hasMore

  return {
    options: displayedOptions, // Return only the items that should be displayed
    allOptions: state.options, // Return all fetched options for debugging
    loading: state.loading,
    error: state.error,
    hasMore: hasMoreToShow, // Has more to show (either from fetched data or API)
    needsMoreData, // Need to fetch more from API
    displayCount: state.displayCount,
    totalFetched: state.options.length,
    search,
    loadMore, // Fetch more from API
    showMore, // Show more from already fetched data
    reset,
    initialize
  }
}
