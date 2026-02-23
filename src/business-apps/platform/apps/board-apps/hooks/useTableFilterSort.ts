/**
 * useTableFilterSort - hybrid server/client filtering and sorting for board table rows.
 *
 * Server-driven: filters + sorts are serialized for the backend API. The server returns
 * already-filtered/sorted rows. Quick search runs client-side for instant feedback.
 *
 * Filter/sort state is persisted to URL parameters so it survives page refreshes.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import type { BoardRow, BoardColumn, ViewFilter, ViewSort, FilterConnector } from '../types'

function normalizeStr(v: unknown): string {
  if (v == null) return ''
  return String(v).toLowerCase()
}

export interface ServerFilterParams {
  filters?: string
  filterConnector?: 'and' | 'or'
  sorts?: string
}

export interface UseTableFilterSortOptions {
  initialFilters?: ViewFilter[]
  initialSorts?: ViewSort[]
  initialConnector?: FilterConnector
  onServerParamsChange?: (params: ServerFilterParams) => void
}

export interface UseTableFilterSortReturn {
  filteredRows: BoardRow[]
  filters: ViewFilter[]
  sorts: ViewSort[]
  connector: FilterConnector
  quickSearch: string
  serverParams: ServerFilterParams
  setQuickSearch: (v: string) => void
  setFilters: (filters: ViewFilter[]) => void
  setSorts: (sorts: ViewSort[]) => void
  setConnector: (c: FilterConnector) => void
  addFilter: (filter: ViewFilter) => void
  updateFilter: (id: string, updates: Partial<ViewFilter>) => void
  removeFilter: (id: string) => void
  addSort: (sort: ViewSort) => void
  updateSort: (id: string, updates: Partial<ViewSort>) => void
  removeSort: (id: string) => void
  clearAll: () => void
  toggleColumnSort: (columnName: string) => void
}

function readFiltersFromUrl(): { filters: ViewFilter[]; sorts: ViewSort[]; connector: FilterConnector } {
  try {
    const params = new URLSearchParams(window.location.search)
    const filtersRaw = params.get('bf')
    const sortsRaw = params.get('bs')
    const connectorRaw = params.get('bc')
    return {
      filters: filtersRaw ? JSON.parse(decodeURIComponent(filtersRaw)) : [],
      sorts: sortsRaw ? JSON.parse(decodeURIComponent(sortsRaw)) : [],
      connector: connectorRaw === 'or' ? 'or' : 'and'
    }
  } catch {
    return { filters: [], sorts: [], connector: 'and' }
  }
}

function writeFiltersToUrl(filters: ViewFilter[], sorts: ViewSort[], connector: FilterConnector) {
  const params = new URLSearchParams(window.location.search)
  if (filters.length > 0) {
    params.set('bf', encodeURIComponent(JSON.stringify(filters)))
  } else {
    params.delete('bf')
  }
  if (sorts.length > 0) {
    params.set('bs', encodeURIComponent(JSON.stringify(sorts)))
  } else {
    params.delete('bs')
  }
  if (connector !== 'and') {
    params.set('bc', connector)
  } else {
    params.delete('bc')
  }
  const newUrl = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', newUrl)
}

export function useTableFilterSort(
  rows: BoardRow[],
  columns: BoardColumn[],
  options?: UseTableFilterSortOptions
): UseTableFilterSortReturn {
  const urlState = useRef(readFiltersFromUrl())
  const hasUrlFilters = urlState.current.filters.length > 0 || urlState.current.sorts.length > 0

  const [filters, setFiltersRaw] = useState<ViewFilter[]>(
    hasUrlFilters ? urlState.current.filters : options?.initialFilters || []
  )
  const [sorts, setSortsRaw] = useState<ViewSort[]>(
    hasUrlFilters ? urlState.current.sorts : options?.initialSorts || []
  )
  const [connector, setConnectorRaw] = useState<FilterConnector>(
    hasUrlFilters ? urlState.current.connector : options?.initialConnector || 'and'
  )
  const [quickSearch, setQuickSearch] = useState('')

  const setFilters = useCallback((f: ViewFilter[]) => {
    setFiltersRaw(f)
  }, [])
  const setSorts = useCallback((s: ViewSort[]) => {
    setSortsRaw(s)
  }, [])
  const setConnector = useCallback((c: FilterConnector) => {
    setConnectorRaw(c)
  }, [])

  useEffect(() => {
    writeFiltersToUrl(filters, sorts, connector)
  }, [filters, sorts, connector])

  useEffect(() => {
    const handlePopState = () => {
      const restored = readFiltersFromUrl()
      setFiltersRaw(restored.filters)
      setSortsRaw(restored.sorts)
      setConnectorRaw(restored.connector)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const serverParams = useMemo<ServerFilterParams>(() => {
    const params: ServerFilterParams = {}
    if (filters.length > 0) {
      params.filters = JSON.stringify(
        filters.map(f => ({
          column: f.column,
          operator: f.operator,
          value: f.value,
          ...(f.secondValue !== undefined ? { secondValue: f.secondValue } : {})
        }))
      )
      if (connector !== 'and') params.filterConnector = connector
    }
    if (sorts.length > 0) {
      params.sorts = JSON.stringify(sorts.map(s => ({ column: s.column, direction: s.direction })))
    }
    return params
  }, [filters, connector, sorts])

  const onServerParamsChangeRef = useRef(options?.onServerParamsChange)
  onServerParamsChangeRef.current = options?.onServerParamsChange
  const prevParamsRef = useRef<string>('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialRef = useRef(true)
  const DEBOUNCE_MS = 350

  useEffect(() => {
    const key = JSON.stringify(serverParams)
    if (key === prevParamsRef.current) return
    prevParamsRef.current = key

    const fire = () => {
      onServerParamsChangeRef.current?.(serverParams)
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (isInitialRef.current) {
      isInitialRef.current = false
      fire()
    } else {
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        fire()
      }, DEBOUNCE_MS)
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [serverParams])

  const filteredRows = useMemo(() => {
    if (!quickSearch.trim()) return rows
    const q = quickSearch.trim().toLowerCase()
    return rows.filter(row =>
      columns.some(col => {
        if (normalizeStr(row.data[col.name]).includes(q)) return true
        if (col.type === 'relation') {
          const labels = row.data[`_rel_${col.name}`]
          if (Array.isArray(labels)) return labels.some(l => normalizeStr(l).includes(q))
        }
        return false
      })
    )
  }, [rows, quickSearch, columns])

  const addFilter = useCallback((f: ViewFilter) => setFiltersRaw(prev => [...prev, f]), [])
  const updateFilter = useCallback(
    (id: string, updates: Partial<ViewFilter>) =>
      setFiltersRaw(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f))),
    []
  )
  const removeFilter = useCallback((id: string) => setFiltersRaw(prev => prev.filter(f => f.id !== id)), [])

  const addSort = useCallback((s: ViewSort) => setSortsRaw(prev => [...prev, s]), [])
  const updateSort = useCallback(
    (id: string, updates: Partial<ViewSort>) =>
      setSortsRaw(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s))),
    []
  )
  const removeSort = useCallback((id: string) => setSortsRaw(prev => prev.filter(s => s.id !== id)), [])

  const clearAll = useCallback(() => {
    setFiltersRaw([])
    setSortsRaw([])
    setConnectorRaw('and')
    setQuickSearch('')
  }, [])

  const toggleColumnSort = useCallback((columnName: string) => {
    setSortsRaw(prev => {
      const existing = prev.find(s => s.column === columnName)
      if (existing) {
        if (existing.direction === 'asc') {
          return prev.map(s => (s.id === existing.id ? { ...s, direction: 'desc' as const } : s))
        }
        return prev.filter(s => s.id !== existing.id)
      }
      return [{ id: `sort-${Date.now()}`, column: columnName, direction: 'asc' as const }]
    })
  }, [])

  return {
    filteredRows,
    filters,
    sorts,
    connector,
    quickSearch,
    serverParams,
    setQuickSearch,
    setFilters,
    setSorts,
    setConnector,
    addFilter,
    updateFilter,
    removeFilter,
    addSort,
    updateSort,
    removeSort,
    clearAll,
    toggleColumnSort
  }
}
