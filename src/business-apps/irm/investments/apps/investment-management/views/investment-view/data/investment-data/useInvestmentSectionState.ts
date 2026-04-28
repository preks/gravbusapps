import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments, type InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'

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

const getBooleanFilterValue = (value: unknown): boolean | null => {
  const normalizedValue = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value

  if (typeof normalizedValue === 'boolean') return normalizedValue
  if (normalizedValue === 'true') return true
  if (normalizedValue === 'false') return false
  return null
}

const normalizePlanedExitFilter = (filters: Record<string, any>): Record<string, any> => {
  if (!('planedExit' in filters)) {
    return filters
  }

  const planedExit = getBooleanFilterValue(filters.planedExit)
  const normalizedFilters = { ...filters }

  if (planedExit === null) {
    delete normalizedFilters.planedExit
    return normalizedFilters
  }

  normalizedFilters.planedExit = planedExit
  return normalizedFilters
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

  // Convert currencyIds → currency.code customCondition (relation path works; scalar path does not).
  const currencyConditions = useMemo(() => {
    const ids: string[] = selectedFilters.currencyIds ?? []
    const codes = ids.map((id: string) => id.split(':').pop()).filter(Boolean)
    if (codes.length === 0) return []
    return [{ currency: { code: { _in: codes } } }]
  }, [selectedFilters.currencyIds])

  // Query variables — strip currencyIds from direct filter path (handled via currencyConditions).
  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const normalizedSelectedFilters = normalizePlanedExitFilter(selectedFilters)
    const existingConditions: Record<string, any>[] = normalizedSelectedFilters.customConditions ?? []
    const listFilters = Object.fromEntries(
      Object.entries(normalizedSelectedFilters).filter(([key]) => key !== 'currencyIds' && key !== 'customConditions')
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
    setVisibleColumns: handleVisibleColumnsChange,
    sorting,
    pagination,
    isInitialLoading,
    handleSortingChange,
    handlePaginationChange
  }
}
