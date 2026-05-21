import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GlobalSearchAdapter } from '../adapters'
import type {
  GlobalSearchEventRequest,
  GlobalSearchResultSelectable,
  SearchCategory,
  SearchItem,
  SearchSection,
  SearchSuggestion
} from '../types'
import { GLOBAL_SEARCH_UI_DEFAULTS } from '../utils/globalSearchUiDefaults'
import { flattenSelectableResults, globalSearchFetchErrorMessage, visibleCategoriesForChips } from '../utils'

const SEARCH_DEBOUNCE_MS = 300

function suggestionLabelsFromQueryResponse(suggestions: SearchSuggestion[] | undefined): string[] {
  if (!suggestions?.length) {
    return []
  }

  return suggestions
    .map(suggestion => suggestion.queryValue ?? suggestion.label)
    .filter((value): value is string => Boolean(value))
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

function categoryIdForCommittedSearch(categoryIds: string[] | undefined): string | undefined {
  return categoryIds?.length === 1 && categoryIds[0] !== 'all' ? categoryIds[0] : undefined
}

function zeroResultTrackingKey(query: string, categoryId: string | undefined): string {
  return `${categoryId ?? 'all'}:${query}`
}

export interface UseGlobalSearchOptions {
  open: boolean
  onOpenChange: (open: boolean) => void
  adapter: GlobalSearchAdapter
}

export interface UseGlobalSearchResult {
  query: string
  setQuery: (query: string) => void
  isLoading: boolean
  errorMessage?: string
  categories: SearchCategory[]
  sections: SearchSection[]
  suggestions: string[]
  selectedCategoryIds: string[]
  selectableResults: GlobalSearchResultSelectable[]
  setSelectedCategories: (categoryId: string) => void
  resetSearch: () => void
  runTarget: (item: SearchItem) => Promise<void>
}

export const useGlobalSearch = ({ open, onOpenChange, adapter }: UseGlobalSearchOptions): UseGlobalSearchResult => {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedInitialResults, setHasLoadedInitialResults] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [categories, setCategories] = useState<SearchCategory[]>([])
  const [sections, setSections] = useState<SearchSection[]>([])
  const [zeroQuerySections, setZeroQuerySections] = useState<SearchSection[]>([])
  const zeroQueryCategoriesRef = useRef<SearchCategory[]>([])
  const zeroQuerySectionsRef = useRef<SearchSection[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [trackingToken, setTrackingToken] = useState<string | undefined>(undefined)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [minQueryLength, setMinQueryLength] = useState(2)
  const [debounceMs, setDebounceMs] = useState(SEARCH_DEBOUNCE_MS)
  const [categorySelectionMode, setCategorySelectionMode] = useState<'SINGLE' | 'MULTIPLE'>('MULTIPLE')
  const searchRequestSequenceRef = useRef(0)
  const zeroResultTrackingKeysRef = useRef<Set<string>>(new Set())

  const selectableResults = useMemo(() => flattenSelectableResults(sections), [sections])

  const resetSearch = useCallback(() => {
    setQuery('')
    setErrorMessage(undefined)
    setCategories(zeroQueryCategoriesRef.current)
    setSections(zeroQuerySectionsRef.current)
    setSelectedCategoryIds([])
    zeroResultTrackingKeysRef.current.clear()
  }, [])

  const requestCategoryIds = useMemo(() => {
    if (selectedCategoryIds.length === 0 || selectedCategoryIds.includes('all')) {
      return undefined
    }
    return selectedCategoryIds
  }, [selectedCategoryIds])

  useEffect(() => {
    if (!open) {
      resetSearch()
      setHasLoadedInitialResults(false)
      return
    }

    const loadInitial = async () => {
      setIsLoading(true)
      setHasLoadedInitialResults(false)
      setErrorMessage(undefined)

      try {
        const zeroQueryResults = await adapter.runQuery({
          q: '',
          paging: {
            limit: GLOBAL_SEARCH_UI_DEFAULTS.pageSize,
            offset: 0
          },
          context: {
            appId: 'business-app-ide',
            currentUri: globalThis.location.pathname
          }
        })

        const suggestionStrings = suggestionLabelsFromQueryResponse(zeroQueryResults.suggestions)
        const nextTrackingToken = zeroQueryResults.meta.trackingToken

        setMinQueryLength(GLOBAL_SEARCH_UI_DEFAULTS.minQueryLength)
        setDebounceMs(SEARCH_DEBOUNCE_MS)
        setCategorySelectionMode(GLOBAL_SEARCH_UI_DEFAULTS.categorySelectionMode)
        const initialCategories = zeroQueryResults.categories ?? []
        setCategories(initialCategories)
        zeroQueryCategoriesRef.current = initialCategories
        setSelectedCategoryIds(initialCategories.filter(category => category.selected).map(category => category.id))
        setZeroQuerySections(zeroQueryResults.data)
        zeroQuerySectionsRef.current = zeroQueryResults.data
        setSections(zeroQueryResults.data)
        setSuggestions(suggestionStrings)
        setTrackingToken(nextTrackingToken)
      } catch (error) {
        setErrorMessage(globalSearchFetchErrorMessage(error, 'Failed to load global search configuration'))
      } finally {
        setHasLoadedInitialResults(true)
        setIsLoading(false)
      }
    }

    void loadInitial()
  }, [adapter, open, resetSearch])

  useEffect(() => {
    const visible = visibleCategoriesForChips(categories)
    if (visible.length === categories.length) {
      return
    }

    const visibleIds = new Set(visible.map(category => category.id))
    setSelectedCategoryIds(previous => {
      const allStillValid = previous.every(id => visibleIds.has(id))
      if (allStillValid) {
        return previous
      }

      const next = previous.filter(id => visibleIds.has(id))
      return next.length > 0 ? next : []
    })
  }, [categories])

  useEffect(() => {
    if (!open) {
      searchRequestSequenceRef.current += 1
      setIsLoading(false)
      return
    }

    const trimmedQuery = query.trim()
    if (trimmedQuery.length < minQueryLength) {
      searchRequestSequenceRef.current += 1
      setIsLoading(false)
      setCategories(zeroQueryCategoriesRef.current)
      setSections(zeroQuerySections)
      return
    }

    setIsLoading(true)

    let isCancelled = false
    const requestSequence = searchRequestSequenceRef.current + 1
    searchRequestSequenceRef.current = requestSequence
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => {
      setErrorMessage(undefined)

      void adapter
        .runQuery(
          {
            q: trimmedQuery,
            categoryIds: requestCategoryIds,
            paging: {
              limit: 10,
              offset: 0
            },
            context: {
              appId: 'business-app-ide',
              currentUri: globalThis.location.pathname
            }
          },
          { signal: abortController.signal }
        )
        .then(response => {
          if (isCancelled || searchRequestSequenceRef.current !== requestSequence) {
            return
          }
          setSections(response.data)
          setCategories(response.categories ?? [])
          setTrackingToken(response.meta.trackingToken)
          setSuggestions(suggestionLabelsFromQueryResponse(response.suggestions))

          if (flattenSelectableResults(response.data).length === 0) {
            const committedCategoryId = categoryIdForCommittedSearch(requestCategoryIds)
            const trackingKey = zeroResultTrackingKey(trimmedQuery, committedCategoryId)

            if (!zeroResultTrackingKeysRef.current.has(trackingKey)) {
              zeroResultTrackingKeysRef.current.add(trackingKey)
              void adapter
                .trackEvents({
                  trackingToken: response.meta.trackingToken,
                  events: [
                    {
                      type: 'ZERO_RESULT_QUERY',
                      q: trimmedQuery,
                      ...(committedCategoryId ? { categoryId: committedCategoryId } : {})
                    }
                  ]
                })
                .catch(() => undefined)
            }
          }
        })
        .catch(error => {
          if (isCancelled || searchRequestSequenceRef.current !== requestSequence || isAbortError(error)) {
            return
          }
          setErrorMessage(globalSearchFetchErrorMessage(error, 'Failed to run global search query'))
        })
        .finally(() => {
          if (!isCancelled && searchRequestSequenceRef.current === requestSequence) {
            setIsLoading(false)
          }
        })
    }, debounceMs)

    return () => {
      isCancelled = true
      abortController.abort()
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }, [adapter, debounceMs, minQueryLength, open, query, requestCategoryIds, zeroQuerySections])

  const setSelectedCategories = useCallback(
    (categoryId: string) => {
      setSelectedCategoryIds(previous => {
        if (categoryId === 'all') {
          return []
        }

        if (categorySelectionMode === 'SINGLE') {
          return [categoryId]
        }

        const next = new Set(previous.filter(id => id !== 'all'))
        if (next.has(categoryId)) {
          next.delete(categoryId)
        } else {
          next.add(categoryId)
        }

        return next.size === 0 ? [] : Array.from(next)
      })
    },
    [categorySelectionMode]
  )

  const runTarget = useCallback(
    async (item: SearchItem) => {
      if (!item.primaryTarget) {
        return
      }

      const isAppAction = item.primaryTarget.kind === 'APP_ACTION'
      const trimmedQuery = query.trim()
      const committedCategoryId = categoryIdForCommittedSearch(requestCategoryIds)
      const events: GlobalSearchEventRequest['events'] = []

      if (trimmedQuery.length >= minQueryLength) {
        events.push({
          type: 'SEARCH_COMMITTED',
          q: trimmedQuery,
          ...(committedCategoryId ? { categoryId: committedCategoryId } : {})
        })
      }

      events.push({
        type: isAppAction ? 'ACTION_TRIGGERED' : 'RESULT_CLICKED',
        ...(trimmedQuery ? { q: trimmedQuery } : {}),
        resultId: item.id,
        rank: item.analytics.rank,
        ...(committedCategoryId ? { categoryId: committedCategoryId } : {}),
        metadata: { entityType: item.type }
      })

      const eventPayload: GlobalSearchEventRequest = {
        trackingToken,
        events
      }

      await adapter.trackEvents(eventPayload).catch(() => undefined)
      onOpenChange(false)
    },
    [adapter, minQueryLength, onOpenChange, query, requestCategoryIds, trackingToken]
  )

  return {
    query,
    setQuery,
    isLoading: isLoading || (open && !hasLoadedInitialResults),
    errorMessage,
    categories,
    sections,
    suggestions,
    selectedCategoryIds,
    selectableResults,
    setSelectedCategories,
    resetSearch,
    runTarget
  }
}
