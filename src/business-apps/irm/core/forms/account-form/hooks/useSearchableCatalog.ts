import { useState, useCallback, useEffect } from 'react'
import { SelectOption } from '../types'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface SearchableCatalogConfig {
  accessToken: string
  catalogIdentifier: string
  pageSize?: number
}

interface SearchableCatalogState {
  allOptions: SelectOption[]
  options: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  needsMoreData: boolean
  displayCount: number
  totalFetched: number
  currentSearch: string
  offset: number
}

export const useSearchableCatalog = ({ accessToken, catalogIdentifier, pageSize = 20 }: SearchableCatalogConfig) => {
  const [state, setState] = useState<SearchableCatalogState>({
    allOptions: [],
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    needsMoreData: false,
    displayCount: 5, // Initial display count
    totalFetched: 0,
    currentSearch: '',
    offset: 0
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const buildCatalogQuery = (search: string = '') =>
    search.trim()
      ? `
        query GetCatalogEntries($catalogIdentifier: String!, $limit: Int, $offset: Int, $search: String) {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: $catalogIdentifier }
                version: { _eq: "v1" }
              }
              _and: [{ value: { _ilike: $search } }]
            }
            limit: $limit
            offset: $offset
            orderBy: [{ value: ASC }]
          ) {
            id
            code
            value
            additionalValue1
            additionalValue2
            additionalValue3
            alternativeCode
            catalog {
              identifier
              version
            }
          }
        }
      `
      : `
        query GetCatalogEntries($catalogIdentifier: String!, $limit: Int, $offset: Int) {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: $catalogIdentifier }
                version: { _eq: "v1" }
              }
            }
            limit: $limit
            offset: $offset
            orderBy: [{ value: ASC }]
          ) {
            id
            code
            value
            additionalValue1
            additionalValue2
            additionalValue3
            alternativeCode
            catalog {
              identifier
              version
            }
          }
        }
      `

  const fetchCatalogEntries = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!accessToken) {
        return
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : {})
      }))

      try {
        const query = buildCatalogQuery(search, offset)

        const variables: any = {
          catalogIdentifier,
          limit: pageSize,
          offset
        }

        if (search.trim()) {
          variables.search = `%${search.trim()}%`
        }

        const response = await graphqlClient.request(query, variables)

        const mappedOptions: SelectOption[] = response.CatalogEntry.map((entry: any) => ({
          id: entry.id,
          name: entry.value || 'Unknown',
          label: entry.value || 'Unknown',
          value: entry.id,
          extraInfo: {
            code: entry.code,
            alternativeCode: entry.alternativeCode,
            additionalValue1: entry.additionalValue1,
            additionalValue2: entry.additionalValue2,
            additionalValue3: entry.additionalValue3
          }
        }))

        const hasMoreRecords = mappedOptions.length === pageSize

        setState(prev => {
          const newAllOptions = append ? [...prev.allOptions, ...mappedOptions] : mappedOptions

          return {
            ...prev,
            allOptions: newAllOptions,
            options: newAllOptions.slice(0, prev.displayCount),
            loading: false,
            hasMore: hasMoreRecords,
            needsMoreData: newAllOptions.length < prev.displayCount && hasMoreRecords,
            totalFetched: newAllOptions.length,
            currentSearch: search,
            offset: append ? prev.offset + mappedOptions.length : mappedOptions.length
          }
        })
      } catch (error) {
        console.error(`❌ Error fetching ${catalogIdentifier} catalog:`, error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : `Failed to fetch ${catalogIdentifier} catalog`
        }))
      }
    },
    [accessToken, graphqlClient, pageSize, catalogIdentifier]
  )

  const search = useCallback(
    (searchTerm: string) => {
      fetchCatalogEntries(searchTerm, 0, false)
    },
    [fetchCatalogEntries]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchCatalogEntries(state.currentSearch, state.offset, true)
    }
  }, [fetchCatalogEntries, state.hasMore, state.loading, state.currentSearch, state.offset])

  const showMore = useCallback(() => {
    setState(prev => {
      const newDisplayCount = Math.min(prev.displayCount + 20, prev.totalFetched)
      return {
        ...prev,
        displayCount: newDisplayCount,
        options: prev.allOptions.slice(0, newDisplayCount),
        needsMoreData: newDisplayCount >= prev.totalFetched && prev.hasMore
      }
    })
  }, [])

  const initialize = useCallback(() => {
    fetchCatalogEntries('', 0, false)
  }, [fetchCatalogEntries])

  useEffect(() => {
    if (accessToken && catalogIdentifier) {
      console.log(`🏷️ ${catalogIdentifier} catalog hook initializing...`)
      initialize()
    }
  }, [accessToken, catalogIdentifier, initialize])

  return {
    allOptions: state.allOptions,
    options: state.options,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    needsMoreData: state.needsMoreData,
    displayCount: state.displayCount,
    totalFetched: state.totalFetched,
    search,
    loadMore,
    showMore,
    initialize
  }
}
