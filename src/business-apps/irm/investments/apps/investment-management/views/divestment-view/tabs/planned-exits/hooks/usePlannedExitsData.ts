import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments, type InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { resolveSearchDescriptorKeys } from '../../../../investment-view/utils/buildInvestmentSectionQueryModel'

export interface UsePlannedExitsSectionStateParams {
  accessToken: string
  selectedFilters: Record<string, any>
}

export interface UsePlannedExitsSectionStateReturn {
  investments: Investment[]
  totalCount: number
  listAggregates: InvestmentListAggregates
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
  /** Descriptor keys the active search is scoped to (visible columns); undefined when no search term. */
  searchDescriptorKeys?: string[]
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

  // Scope free-text search to the visible table columns (mirrors the Investments tab) so the
  // generated `_or` only targets displayed columns instead of every descriptor.
  const searchDescriptorKeys = useMemo(
    () => (search.trim() && visibleColumns.length ? resolveSearchDescriptorKeys(visibleColumns) : undefined),
    [search, visibleColumns]
  )

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
      ...(searchDescriptorKeys?.length ? { searchDescriptorKeys } : {}),
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'plannedExitDate', direction: 'ASC_NULLS_LAST' }],
      customConditions: [...baseConditions, ...extraConditions],
      ...restFilters
    }
  }, [currentPage, pageSize, search, searchDescriptorKeys, sortField, sortOrder, selectedFilters])

  const {
    investments,
    total: totalCount,
    listAggregates,
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
    searchDescriptorKeys,
    sorting,
    pagination,
    isInitialLoading,
    handleSortingChange,
    handlePaginationChange
  }
}
