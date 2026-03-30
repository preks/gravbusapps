import { useState, useCallback, useEffect, useMemo } from 'react'
import { useContentEntries } from '@/common/data/content/hooks/useContentEntries'
import type { ContentEntry } from '@/common/data/content/types/contentEntryTypes'
import type { ContentEntryQueryParams } from '@/common/data/content/queries/contentQueries'
import { ContentGroup, ContentRole } from '@/common/data/content/types/contentEnums'

// Define types locally since nw-design-system doesn't export them
export type SortingState = Array<{
  id: string
  desc: boolean
}>

export interface PaginationState {
  pageIndex: number
  pageSize: number
}

export interface ContentDataFilters {
  contentGroups?: string[]
  contentTypeId?: string[]
  categoryIds?: string[]
  status?: string[]
  creatorEmployeeId?: string[]
  dateRange?: { start?: string; end?: string }
}

export interface UseContentDataParams {
  type?: 'all' | 'news' | 'knowledge' | 'policy' | 'document' | 'question'
  accessToken: string
}

export interface UseContentDataReturn {
  data: ContentEntry[]
  total: number
  loading: boolean
  error: Error | null
  search: string
  setSearch: (search: string) => void
  filters: ContentDataFilters
  setFilters: (filters: ContentDataFilters) => void
  sorting: SortingState
  setSorting: (sorting: SortingState) => void
  pagination: PaginationState
  setPagination: (pagination: PaginationState) => void
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void
  selectedRows: ContentEntry[]
  setSelectedRows: (rows: ContentEntry[]) => void
  refetch: () => Promise<void>
}

export const useContentData = ({ type = 'all', accessToken }: UseContentDataParams): UseContentDataReturn => {
  // State management
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ContentDataFilters>({})
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20
  })
  // Set visible columns based on type (order: Group | Type)
  const defaultColumns = useMemo(() => {
    const baseColumns = ['group', 'type', 'title', 'author', 'createdAt', 'status', 'actions']
    if (type === 'all') {
      return [...baseColumns, 'reactions', 'comments']
    }
    return [...baseColumns, 'reactions', 'comments']
  }, [type])

  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns)
  const [selectedRows, setSelectedRows] = useState<ContentEntry[]>([])

  // Map type to contentGroup filter
  const contentGroupFilter = useMemo(() => {
    if (type === 'all') return undefined
    const groupMap: Record<string, ContentGroup> = {
      news: ContentGroup.NEWS,
      knowledge: ContentGroup.KNOWLEDGE,
      policy: ContentGroup.POLICY,
      document: ContentGroup.DOCUMENT,
      question: ContentGroup.QUESTION
    }
    return groupMap[type]
  }, [type])

  // Build query params for API
  const queryParams = useMemo((): ContentEntryQueryParams => {
    // Map column ID to actual GraphQL field name or aggregate path
    const sortColumnId = sorting[0]?.id || 'createdAt'
    const sortOrder: 'DESC' | 'ASC' = sorting[0]?.desc ? 'DESC' : 'ASC'

    let sortBy: string

    // Handle aggregate sorting differently
    if (sortColumnId === 'reactions') {
      sortBy = 'contentEntryReactionAggregate.count'
    } else if (sortColumnId === 'comments') {
      sortBy = 'descendantContentEntriesAggregate.count'
    } else {
      // Regular field mapping
      const columnToFieldMap: Record<string, string> = {
        type: 'contentTypeId',
        group: 'contentGroup',
        title: 'title',
        author: 'creatorEmployeeId',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        status: 'isDeleted'
      }
      sortBy = columnToFieldMap[sortColumnId] || sortColumnId
    }

    return {
      role: ContentRole.ROOT, // Only show root content entries (not comments)
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: search.trim(),
      sortBy,
      sortOrder,
      contentGroup: contentGroupFilter || filters.contentGroups?.[0],
      contentTypeId: filters.contentTypeId?.[0],
      categoryIds: filters.categoryIds,
      // Note: Status filtering requires custom implementation
      creatorEmployeeId: filters.creatorEmployeeId?.[0],
      activeFrom: filters.dateRange?.start,
      activeTo: filters.dateRange?.end
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    search,
    sorting,
    contentGroupFilter,
    filters.contentGroups,
    filters.contentTypeId,
    filters.categoryIds,
    filters.creatorEmployeeId,
    filters.dateRange
  ])

  // Use central content data hook
  const { entries, totalCount, isLoading, error, refetch } = useContentEntries(queryParams, accessToken)

  // Filter by status locally (if isDeleted filtering is needed)
  const filteredEntries = useMemo(() => {
    if (!filters.status || filters.status.length === 0) {
      return entries
    }

    return entries.filter(entry => {
      if (filters.status?.includes('active') && !entry.isDeleted) return true
      if (filters.status?.includes('deleted') && entry.isDeleted) return true
      return false
    })
  }, [entries, filters.status])

  // Reset to first page when filters or search changes
  useEffect(() => {
    if (pagination.pageIndex !== 0) {
      setPagination((prev: PaginationState) => ({ ...prev, pageIndex: 0 }))
    }
  }, [search, filters, contentGroupFilter])

  // Refetch wrapper
  const handleRefetch = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    data: filteredEntries,
    total: totalCount,
    loading: isLoading,
    error,
    search,
    setSearch,
    filters,
    setFilters,
    sorting,
    setSorting,
    pagination,
    setPagination,
    visibleColumns,
    setVisibleColumns,
    selectedRows,
    setSelectedRows,
    refetch: handleRefetch
  }
}
