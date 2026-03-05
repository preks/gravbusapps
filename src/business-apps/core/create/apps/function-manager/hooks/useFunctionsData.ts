import { useState, useCallback, useEffect, useMemo } from 'react'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
import type { SortingState } from '@tanstack/react-table'
import { getDefaultVisibleColumns } from '../config/functionsColumns'

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface UseFunctionsDataReturn {
  data: LatestFunctionItem[]
  total: number
  loading: boolean
  error: string | null
  search: string
  setSearch: (search: string) => void
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
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

  // Filter items based on search
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        String(item.latestVersion?.version || '').includes(q)
    )
  }, [allItems, search])

  const sortedItems = useMemo(() => {
    const s = sorting && sorting.length ? sorting[0] : null
    if (!s?.id) return filteredItems

    const dir = s.desc ? -1 : 1
    const getValue = (item: LatestFunctionItem) => {
      if (s.id === 'name') return String(item.name || '')
      if (s.id === 'description') return String(item.description || '')
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

  // Reset to first page when sorting changes
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [sorting])

  return {
    data: paginatedItems,
    total: sortedItems.length,
    loading,
    error,
    search,
    setSearch,
    pagination,
    setPagination,
    visibleColumns,
    setVisibleColumns,
    refetch: fetchData
  }
}
