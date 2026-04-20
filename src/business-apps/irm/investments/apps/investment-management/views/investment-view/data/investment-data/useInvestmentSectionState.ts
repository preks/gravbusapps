import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments, type InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'

export interface UseInvestmentSectionStateParams {
  accessToken: string
  selectedFilters: Record<string, any>
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

export const useInvestmentSectionState = ({
  accessToken,
  selectedFilters
}: UseInvestmentSectionStateParams): UseInvestmentSectionStateReturn => {
  // State
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'investmentGroup',
    'investmentType',
    'totalInvestmentAmount',
    'ownerEmployee',
    'investmentStatus',
    'createdAt',
    'actions'
  ])
  const initialLoadDone = useRef(false)

  // Convert currencyIds → currency.code customCondition (relation path works; scalar path does not).
  const currencyConditions = useMemo(() => {
    const ids: string[] = selectedFilters.currencyIds ?? []
    const codes = ids.map((id: string) => id.split(':').pop()).filter(Boolean)
    if (codes.length === 0) return []
    return [{ currency: { code: { _in: codes } } }]
  }, [selectedFilters.currencyIds])

  // Query variables — strip currencyIds from direct filter path (handled via currencyConditions).
  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const existingConditions: Record<string, any>[] = selectedFilters.customConditions ?? []
    const listFilters = Object.fromEntries(
      Object.entries(selectedFilters).filter(([key]) => key !== 'currencyIds' && key !== 'customConditions')
    )
    const mergedConditions = [...existingConditions, ...currencyConditions]
    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
      ...listFilters,
      ...(mergedConditions.length > 0 ? { customConditions: mergedConditions } : {})
    }
  }, [currentPage, pageSize, search, sortField, sortOrder, selectedFilters, currencyConditions])

  // Fetch data
  const {
    investments,
    total: totalCount,
    listAggregates,
    loading,
    error,
    refetch
  } = useInvestments(accessToken, queryVariables, 'list')

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
    listAggregates,
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
