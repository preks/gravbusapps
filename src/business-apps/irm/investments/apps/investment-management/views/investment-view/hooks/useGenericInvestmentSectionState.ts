import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import { investmentListQueryConfigForGroup } from '../utils/investmentListQueryConfig'

export interface GenericInvestmentSectionStateProps {
  accessToken: string
  groupCode: string
  selectedFilters: Record<string, any>
}

/**
 * Generic hook for fetching investments filtered by investment group.
 * Manages its own pagination, sorting, search, and column-visibility state
 * so it returns the same shape as useInvestmentSectionState — allowing
 * InvestmentView to treat all tabs uniformly (handlePaginationChange, etc.).
 */
export const useGenericInvestmentSectionState = ({
  accessToken,
  groupCode,
  selectedFilters
}: GenericInvestmentSectionStateProps) => {
  // Local UI state (mirrors useInvestmentSectionState)
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

  // Group condition — stable as long as groupCode doesn't change
  const groupCondition = useMemo(
    () => [{ investmentGroup: { id: { _eq: `InvestmentGroup:v1:${groupCode}` } } }],
    [groupCode]
  )

  // Convert currencyIds → currency.code customCondition (relation path works; scalar path does not)
  const currencyConditions = useMemo(() => {
    const ids: string[] = selectedFilters.currencyIds ?? []
    const codes = ids.map((id: string) => id.split(':').pop()).filter(Boolean)
    if (codes.length === 0) return []
    return [{ currency: { code: { _in: codes } } }]
  }, [selectedFilters.currencyIds])

  // Build query variables — strip currencyIds (handled via currencyConditions above)
  const investmentTypeFilter = useMemo(() => {
    if (groupCode === 'EQUITY') return { equityInvestment: { id: { _isNull: false } } }
    if (groupCode === 'REAL_ESTATE') return { realEstateInvestment: { id: { _isNull: false } } }
    if (groupCode === 'LIQUID_FUND') return { liquidFundInvestment: { id: { _isNull: false } } }
    return {}
  }, [groupCode])

  const queryVariables = useMemo(() => {
    const existingConditions: Record<string, any>[] = selectedFilters.customConditions ?? []
    const listFilters = Object.fromEntries(
      Object.entries(selectedFilters).filter(([key]) => key !== 'currencyIds' && key !== 'customConditions')
    )
    const mergedConditions = [...groupCondition, ...existingConditions, ...currencyConditions]
    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }],
      ...listFilters,
      ...investmentTypeFilter,
      customConditions: mergedConditions
    }
  }, [
    pageSize,
    currentPage,
    search,
    sortField,
    sortOrder,
    selectedFilters,
    groupCondition,
    currencyConditions,
    investmentTypeFilter
  ])

  const listQueryConfig = useMemo(() => investmentListQueryConfigForGroup(groupCode), [groupCode])

  const {
    investments,
    total: totalCount,
    listAggregates,
    loading,
    error,
    refetch
  } = useInvestments(accessToken, queryVariables, listQueryConfig)

  // Track initial load
  useEffect(() => {
    if (loading === false && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [loading])
  const isInitialLoading = loading && !initialLoadDone.current

  // Sorting format expected by DataDisplay
  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  // Pagination format expected by DataDisplay
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    if (newSorting.length === 0) {
      setSortField('')
      setSortOrder('DESC')
      setCurrentPage(1)
    } else {
      const first = newSorting[0]
      setSortField(first.id)
      setSortOrder(first.desc ? 'DESC' : 'ASC')
      setCurrentPage(1)
    }
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])

  return {
    investments,
    // Use `total` as `totalCount` so InvestmentView can normalise with `?? total` fallback
    total: totalCount,
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
