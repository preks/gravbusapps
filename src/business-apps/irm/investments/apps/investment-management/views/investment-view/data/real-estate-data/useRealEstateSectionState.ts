import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'

export interface UseRealEstateSectionStateParams {
  accessToken: string
  selectedFilters: Record<string, any>
}

export interface UseRealEstateSectionStateReturn {
  // Data
  investments: Investment[]
  totalCount: number
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

export const useRealEstateSectionState = ({
  accessToken,
  selectedFilters
}: UseRealEstateSectionStateParams): UseRealEstateSectionStateReturn => {
  // State
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'investmentType',
    'totalInvestmentAmount',
    'acquisitionDate',
    'ownerEmployee',
    'investmentStatus',
    'createdAt',
    'actions'
  ])
  const initialLoadDone = useRef(false)

  // Query variables
  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    // Remove investment type filters from selectedFilters to avoid conflicts
    const otherFilters = Object.fromEntries(
      Object.entries(selectedFilters).filter(
        ([key]) => !['realEstateInvestment', 'liquidFundInvestment', 'equityInvestment'].includes(key)
      )
    )

    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: sortField
        ? [
            {
              field: sortField,
              direction: sortOrder === 'ASC' ? ('ASC_NULLS_LAST' as const) : ('DESC_NULLS_LAST' as const)
            }
          ]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }],
      ...otherFilters,
      // Always enforce real estate investment filter for this tab
      // Check that at least one related record exists (Hasura array relationship filter)
      realEstateInvestment: { id: { _isNull: false } }
    }
  }, [currentPage, pageSize, search, sortField, sortOrder, selectedFilters])

  // Fetch data
  const {
    investments,
    total: totalCount,
    loading,
    error,
    refetch
  } = useInvestments(accessToken, queryVariables, 'realEstate')

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
      pageSize: pageSize
    }),
    [currentPage, pageSize]
  )

  // Handlers
  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
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
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])

  return {
    investments,
    totalCount,
    loading,
    error,
    refetch,
    search,
    setSearch,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    visibleColumns,
    setVisibleColumns,
    sorting,
    pagination,
    isInitialLoading,
    handleSortingChange,
    handlePaginationChange
  }
}
