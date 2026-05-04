import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments, type InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { buildInvestmentSectionQueryModel } from '../../utils/buildInvestmentSectionQueryModel'

export interface UseInvestmentSectionStateParams {
  accessToken: string
  selectedFilters: Record<string, any>
  initialSorting?: Array<{ id: string; desc: boolean }> | null
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialVisibleColumns?: string[] | null
  onVisibleColumnsChange?: (columns: string[]) => void
}

export interface UseInvestmentSectionStateReturn {
  // Data
  investments: Investment[]
  totalCount: number
  listAggregates: InvestmentListAggregates
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  // State
  search: string
  setSearch: (value: string) => void
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void
  // Computed
  sorting: Array<{ id: string; desc: boolean }>
  pagination: { pageIndex: number; pageSize: number }
  isInitialLoading: boolean
  // Handlers
  handleSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  handlePaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
}

const DEFAULT_VISIBLE_COLUMNS = [
  'name',
  'investmentGroup',
  'investmentType',
  'totalInvestmentAmount',
  'ownerEmployee',
  'investmentStatus',
  'createdAt',
  'actions'
]

export const useInvestmentSectionState = ({
  accessToken,
  selectedFilters,
  initialSorting,
  onSortingChange,
  initialVisibleColumns,
  onVisibleColumnsChange
}: UseInvestmentSectionStateParams): UseInvestmentSectionStateReturn => {
  const initialSort = initialSorting?.[0]
  // State
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState(initialSort?.id ?? '')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialSort?.desc === false ? 'ASC' : 'DESC')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns ?? DEFAULT_VISIBLE_COLUMNS)
  const initialLoadDone = useRef(false)

  const queryModel = useMemo(
    () =>
      buildInvestmentSectionQueryModel({
        selectedFilters,
        search,
        sortField,
        sortOrder,
        currentPage,
        pageSize
      }),
    [currentPage, pageSize, search, selectedFilters, sortField, sortOrder]
  )

  // Fetch data
  const {
    investments,
    total: totalCount,
    listAggregates,
    loading,
    error,
    refetch
  } = useInvestments(accessToken, queryModel.queryVariables, queryModel.queryFields, queryModel.sortDescriptors)

  // Track initial load
  useEffect(() => {
    if (loading === false && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [loading])
  const isInitialLoading = loading && !initialLoadDone.current

  // Convert sorting format
  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  // Convert pagination format
  const pagination = useMemo(
    () => ({
      pageIndex: currentPage - 1,
      pageSize
    }),
    [currentPage, pageSize]
  )

  // Handlers
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      onSortingChange?.(newSorting)

      if (newSorting.length === 0) {
        setSortField('')
        setSortOrder('DESC')
        setCurrentPage(1)
      } else {
        const firstSort = newSorting[0]
        setSortField(firstSort.id)
        setSortOrder(firstSort.desc ? 'DESC' : 'ASC')
        setCurrentPage(1)
      }
    },
    [onSortingChange]
  )

  const handleVisibleColumnsChange = useCallback(
    (columns: string[]) => {
      setVisibleColumns(columns)
      onVisibleColumnsChange?.(columns)
    },
    [onVisibleColumnsChange]
  )

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }, [])

  return {
    investments,
    totalCount,
    listAggregates,
    loading,
    error,
    refetch,
    search,
    setSearch: handleSearchChange,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    visibleColumns,
    setVisibleColumns: handleVisibleColumnsChange,
    sorting,
    pagination,
    isInitialLoading,
    handleSortingChange,
    handlePaginationChange
  }
}
