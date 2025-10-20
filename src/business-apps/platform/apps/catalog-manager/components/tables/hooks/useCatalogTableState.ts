import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BaseCatalog, CatalogEntry, useCatalog } from '@/common/data/catalog'
import { useCatalogData } from '../../../hooks/useCatalogData'

export interface TableState {
  searchTerm: string
  hasMore: boolean
  isLoadingMore: boolean
  allEntries: CatalogEntry[]
  currentLimit: number
  editedEntries: Map<string, Partial<CatalogEntry>>
  isSaving: boolean
  expandedRows: Set<string>
  draftEntryIds: Set<string>
  selectedIds: Set<string>
  bulkDeleteProgress?: { current: number; total: number } | null
}

export interface JsonEditorState {
  isOpen: boolean
  entry: CatalogEntry | null
  jsonText: string
  isValid: boolean
  error: string | null
  hasChanges: boolean
}

const INITIAL_LOAD = 100
const LOAD_MORE_SIZE = 50

export const useCatalogTableState = (
  context: BusinessAppContextProps,
  catalog: BaseCatalog,
  prefetched?: {
    initialEntries?: CatalogEntry[]
    initialTotalCount?: number
    externalLoadEntries?: (
      searchTerm?: string,
      limit?: number,
      offset?: number
    ) => Promise<{ entries: CatalogEntry[]; totalCount: number }>
  }
) => {
  const [state, setState] = useState<TableState>({
    searchTerm: '',
    hasMore: true,
    isLoadingMore: false,
    allEntries: [],
    currentLimit: INITIAL_LOAD,
    editedEntries: new Map(),
    isSaving: false,
    expandedRows: new Set(),
    draftEntryIds: new Set(),
    selectedIds: new Set(),
    bulkDeleteProgress: null
  })

  const [jsonEditorState, setJsonEditorState] = useState<JsonEditorState>({
    isOpen: false,
    entry: null,
    jsonText: '',
    isValid: true,
    error: null,
    hasChanges: false
  })

  const tableRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  // Single-request: useCatalog with embedded entries
  const { fetchCatalog } = useCatalog(context)
  const [entries, setEntries] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState<number>(0)

  // CRUD operations (original functionality restored)
  const { createCatalogEntry, updateCatalogEntry, deleteCatalogEntry, importCatalogEntries, exportCatalogs } =
    useCatalogData({ accessToken: context.accessToken })

  // Load entries with current parameters
  const loadEntries = useCallback(
    async (searchTerm = '', limit = INITIAL_LOAD, offset = 0) => {
      setError(null)
      try {
        if (prefetched?.externalLoadEntries) {
          const res = await prefetched.externalLoadEntries(searchTerm, limit, offset)
          setEntries(res.entries)
          setTotalCount(res.totalCount)
          return
        }
        const full = await fetchCatalog(
          {
            identifier: catalog.identifier,
            version: catalog.version || 'v1',
            entriesLimit: limit,
            entriesOffset: offset,
            search: searchTerm.trim() || undefined
          },
          { includeCatalogEntries: true, includeChildCatalogEntries: true, includeParentCatalogEntry: true }
        )
        if (full) {
          setEntries(full.entries || [])
          setTotalCount(full.total || full.entries?.length || 0)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    },
    [prefetched?.externalLoadEntries, fetchCatalog, catalog.identifier, catalog.version]
  )

  // Initial load
  useEffect(() => {
    if (prefetched?.initialEntries) {
      setEntries(prefetched.initialEntries)
      setTotalCount(prefetched.initialTotalCount || prefetched.initialEntries.length)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    loadEntries(state.searchTerm, state.currentLimit).finally(() => setIsLoading(false))
  }, [catalog.identifier, catalog.version, loadEntries, prefetched?.initialEntries, prefetched?.initialTotalCount])

  // Update local state when entries change - preserve draft rows at the top
  useEffect(() => {
    setState(prev => {
      const draftEntries = prev.allEntries.filter(e => prev.draftEntryIds.has(e.id))
      return {
        ...prev,
        allEntries: [...draftEntries, ...entries],
        hasMore: entries.length >= prev.currentLimit
      }
    })
  }, [entries])

  // Handle search with comprehensive field coverage
  const handleSearchChange = useCallback(
    (value: string) => {
      setState(prev => ({
        ...prev,
        searchTerm: value,
        currentLimit: INITIAL_LOAD
      }))
      loadEntries(value, INITIAL_LOAD)
    },
    [loadEntries]
  )

  // Load more entries (infinite scroll)
  const loadMoreEntries = useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return

    setState(prev => ({ ...prev, isLoadingMore: true }))
    const newLimit = state.currentLimit + LOAD_MORE_SIZE
    await loadEntries(state.searchTerm, newLimit)
    setState(prev => ({ ...prev, currentLimit: newLimit, isLoadingMore: false }))
  }, [state.isLoadingMore, state.hasMore, state.currentLimit, state.searchTerm, loadEntries])

  // Calculate this inside the render to ensure it updates when state changes
  const hasUnsavedChanges = state.editedEntries.size > 0

  return {
    state,
    setState,
    jsonEditorState,
    setJsonEditorState,
    tableRef,
    loadingRef,
    entries,
    isLoading,
    error,
    totalCount,
    createCatalogEntry,
    updateCatalogEntry,
    deleteCatalogEntry,
    importCatalogEntries,
    exportCatalogs,
    loadEntries,
    handleSearchChange,
    loadMoreEntries,
    hasUnsavedChanges,
    INITIAL_LOAD,
    LOAD_MORE_SIZE
  }
}

export default useCatalogTableState
