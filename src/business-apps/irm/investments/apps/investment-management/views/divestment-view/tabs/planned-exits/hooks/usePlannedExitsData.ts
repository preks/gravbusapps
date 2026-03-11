import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'

export interface UsePlannedExitsSectionStateParams {
  accessToken: string
  selectedFilters: Record<string, any>
}

export interface UsePlannedExitsSectionStateReturn {
  investments: Investment[]
  totalCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  search: string
  setSearch: (value: string) => void
  currentPage: number
  pageSize: number
  sortField: string
  sortOrder: 'ASC' | 'DESC'
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void
  sorting: Array<{ id: string; desc: boolean }>
  pagination: { pageIndex: number; pageSize: number }
  isInitialLoading: boolean
  handleSortingChange: (sorting: Array<{ id: string; desc: boolean }>) => void
  handlePaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void
}

export const usePlannedExitsSectionState = ({
  accessToken,
  selectedFilters
}: UsePlannedExitsSectionStateParams): UsePlannedExitsSectionStateReturn => {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('plannedExitDate')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC')
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'investmentGroup',
    'investmentType',
    'totalInvestmentAmount',
    'investmentMarketValue',
    'performance',
    'plannedExitDate',
    'ownerEmployee',
    'createdAt'
  ])
  const initialLoadDone = useRef(false)

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const baseConditions: Record<string, any>[] = [{ planedExit: { _eq: true } }]
    const extraConditions: Record<string, any>[] = selectedFilters.customConditions ?? []
    const restFilters = Object.fromEntries(
      Object.entries(selectedFilters).filter(([key]) => key !== 'customConditions')
    )
    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'plannedExitDate', direction: 'ASC_NULLS_LAST' }],
      customConditions: [...baseConditions, ...extraConditions],
      ...restFilters
    }
  }, [currentPage, pageSize, search, sortField, sortOrder, selectedFilters])

  const {
    investments,
    total: totalCount,
    loading,
    error,
    refetch
  } = useInvestments(accessToken, queryVariables, 'list')

  useEffect(() => {
    if (loading === false && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [loading])
  const isInitialLoading = loading && !initialLoadDone.current

  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  const pagination = useMemo(
    () => ({
      pageIndex: currentPage - 1,
      pageSize
    }),
    [currentPage, pageSize]
  )

  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    if (newSorting.length === 0) {
      setSortField('plannedExitDate')
      setSortOrder('ASC')
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
