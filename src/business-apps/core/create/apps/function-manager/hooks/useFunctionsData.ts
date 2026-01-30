import { useState, useCallback, useEffect, useMemo } from 'react'
import { FunctionsServiceClient, LatestFunctionItem } from '@/common/network/functions/FunctionsServiceClient'
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

export const useFunctionsData = (accessToken?: string): UseFunctionsDataReturn => {
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
      const list = await client.listLatest({ agentEnabled: true })
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

  // Paginate the filtered items
  const paginatedItems = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    return filteredItems.slice(start, end)
  }, [filteredItems, pagination.pageIndex, pagination.pageSize])

  // Reset to first page when search changes
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [search])

  return {
    data: paginatedItems,
    total: filteredItems.length,
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
