import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  FunctionsServiceClient,
  FUNCTION_CATEGORIES,
  type FunctionCategory,
  type LatestFunctionItem
} from '@/common/network/functions/FunctionsServiceClient'
import type { SortingState } from '@tanstack/react-table'
import { getDefaultVisibleColumns } from '../config/functionsColumns'

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

/** 'All' = no category filter applied; any other value narrows to that category. */
export type CategoryFilter = 'All' | FunctionCategory

export interface UseFunctionsDataReturn {
  data: LatestFunctionItem[]
  /** Full, unpaginated, unfiltered list. Useful for deep-link lookups by id. */
  allItems: LatestFunctionItem[]
  total: number
  /** Per-category counts computed from the full unfiltered list (for tab badges). */
  categoryCounts: Record<CategoryFilter, number>
  loading: boolean
  error: string | null
  search: string
  setSearch: (search: string) => void
  category: CategoryFilter
  setCategory: (category: CategoryFilter) => void
  pagination: PaginationState
  setPagination: (pagination: PaginationState) => void
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void
  refetch: () => Promise<void>
}

const compareStrings = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

export const useFunctionsData = (accessToken?: string, sorting?: SortingState): UseFunctionsDataReturn => {
  const client = useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])

  const [allItems, setAllItems] = useState<LatestFunctionItem[]>([])
  // Initial loading is `true` (not false) so the consumer's "invalid functionId" cleanup effect
  // doesn't fire in the tiny mount window before the first fetchData() call has started and
  // flipped this flag. Without this, deep-links like ?functionId=<id> get their URL stripped
  // before allItems is populated, silently bouncing the user back to the list.
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getDefaultVisibleColumns())

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await client.listLatest()
      setAllItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load functions')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Counts per category for tab badges (computed from the full unfiltered list).
  const categoryCounts = useMemo<Record<CategoryFilter, number>>(() => {
    const counts = { All: allItems.length } as Record<CategoryFilter, number>
    for (const c of FUNCTION_CATEGORIES) counts[c] = 0
    for (const item of allItems) {
      const cat = (item.category as FunctionCategory) || 'General'
      if (cat in counts) counts[cat] = (counts[cat] || 0) + 1
      else counts.General = (counts.General || 0) + 1
    }
    return counts
  }, [allItems])

  // Apply category + search filter (client-side; category also accepted server-side for agents).
  const filteredItems = useMemo(() => {
    const categoryFiltered =
      category === 'All' ? allItems : allItems.filter(item => (item.category || 'General') === category)
    const q = search.trim().toLowerCase()
    if (!q) return categoryFiltered
    return categoryFiltered.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.subcategory || '').toLowerCase().includes(q) ||
        String(item.latestVersion?.version || '').includes(q)
    )
  }, [allItems, search, category])

  const sortedItems = useMemo(() => {
    const s = sorting && sorting.length ? sorting[0] : null
    if (!s?.id) return filteredItems

    const dir = s.desc ? -1 : 1
    const getValue = (item: LatestFunctionItem) => {
      if (s.id === 'name') return String(item.name || '')
      if (s.id === 'description') return String(item.description || '')
      if (s.id === 'category') return String(item.category || '')
      if (s.id === 'subcategory') return String(item.subcategory || '')
      if (s.id === 'agentEnabled') return item.agentEnabled ? 1 : 0
      if (s.id === 'workflowEnabled') return item.workflowEnabled ? 1 : 0
      if (s.id === 'version') return Number(item.latestVersion?.version || 0)
      if (s.id === 'lastVersionAt') return Date.parse(String(item.latestVersion?.createdAt || '')) || 0
      return ''
    }

    const items = [...filteredItems]
    items.sort((a, b) => {
      const va = getValue(a) as any
      const vb = getValue(b) as any
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return compareStrings(String(va ?? ''), String(vb ?? '')) * dir
    })
    return items
  }, [filteredItems, sorting])

  // Paginate the sorted items
  const paginatedItems = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedItems.slice(start, end)
  }, [sortedItems, pagination.pageIndex, pagination.pageSize])

  // Reset to first page when search changes
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [search])

  // Reset to first page when category changes
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [category])

  // Reset to first page when sorting changes
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [sorting])

  return {
    data: paginatedItems,
    allItems,
    total: sortedItems.length,
    categoryCounts,
    loading,
    error,
    search,
    setSearch,
    category,
    setCategory,
    pagination,
    setPagination,
    visibleColumns,
    setVisibleColumns,
    refetch: fetchData
  }
}
