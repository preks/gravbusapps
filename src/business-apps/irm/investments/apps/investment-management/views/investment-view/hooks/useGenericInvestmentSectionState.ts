import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import type { InvestmentDynamicFilterCondition } from '../utils/investmentListColumnTransformer'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildInvestmentSectionQueryModel } from '../utils/buildInvestmentSectionQueryModel'
import type { InvestmentGroup } from './useInvestmentGroups'

export interface GenericInvestmentSectionStateProps {
  accessToken: string
  group: InvestmentGroup | null
  /** Unique key for the active section (e.g. currentSection / tabId).
   *  When it changes, all local state (sort, page, search, columns) resets
   *  synchronously so the very first query for the new tab uses the correct values. */
  sectionKey?: string
  selectedFilters: Record<string, any>
  defaultVisibleColumns?: string[]
  /** Last search the user had on this section — restored when switching back to it. */
  initialSearch?: string
  onSearchChange?: (search: string) => void
  initialSorting?: Array<{ id: string; desc: boolean }> | null
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialVisibleColumns?: string[] | null
  onVisibleColumnsChange?: (columns: string[]) => void
  queryFields?: string[]
  sortDescriptors?: Descriptor[]
  sortFieldByColumnId?: Record<string, string>
  filterConditionByFilterId?: Record<string, InvestmentDynamicFilterCondition>
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

const resolveSortField = (
  initialSorting: Array<{ id: string; desc: boolean }> | null | undefined,
  sortFieldByColumnId: Record<string, string>
): string => {
  const first = initialSorting?.[0]
  return first ? sortFieldByColumnId[first.id] || first.id : ''
}

const resolveSortOrder = (initialSorting: Array<{ id: string; desc: boolean }> | null | undefined): 'ASC' | 'DESC' => {
  return initialSorting?.[0]?.desc === false ? 'ASC' : 'DESC'
}

/**
 * Generic hook for fetching investments filtered by investment group.
 * Manages its own pagination, sorting, search, and column-visibility state
 * so it returns the same shape as useInvestmentSectionState — allowing
 * InvestmentView to treat all tabs uniformly (handlePaginationChange, etc.).
 *
 * State resets synchronously when `sectionKey` changes (React "adjusting state
 * during render" pattern) so no stale query fires on tab switch.
 */
export const useGenericInvestmentSectionState = ({
  accessToken,
  group,
  sectionKey,
  selectedFilters,
  defaultVisibleColumns,
  initialSearch,
  onSearchChange,
  initialSorting,
  onSortingChange,
  initialVisibleColumns,
  onVisibleColumnsChange,
  queryFields,
  sortDescriptors,
  sortFieldByColumnId = {},
  filterConditionByFilterId = {}
}: GenericInvestmentSectionStateProps) => {
  const [search, setSearch] = useState(initialSearch ?? '')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState(() => resolveSortField(initialSorting, sortFieldByColumnId))
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(() => resolveSortOrder(initialSorting))
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => initialVisibleColumns ?? DEFAULT_VISIBLE_COLUMNS)
  const initialLoadDone = useRef(false)

  // ─── Synchronous state reset on section change ────────────────────────────
  // Using React's "adjusting state during render" pattern:
  // When sectionKey changes React discards this render and immediately retries
  // with the updated state, so the first query for the new tab already carries
  // the correct sort / columns — no stale-data flash.
  const [prevSectionKey, setPrevSectionKey] = useState<string | undefined>(sectionKey)
  if (sectionKey !== undefined && sectionKey !== prevSectionKey) {
    const newSortField = resolveSortField(initialSorting, sortFieldByColumnId)
    const newSortOrder = resolveSortOrder(initialSorting)
    setPrevSectionKey(sectionKey)
    setSortField(newSortField)
    setSortOrder(newSortOrder)
    setCurrentPage(1)
    setSearch(initialSearch ?? '')
    setVisibleColumns(initialVisibleColumns ?? defaultVisibleColumns ?? DEFAULT_VISIBLE_COLUMNS)
  }
  // ─────────────────────────────────────────────────────────────────────────

  const queryModel = useMemo(
    () =>
      buildInvestmentSectionQueryModel({
        selectedFilters,
        search,
        sortField,
        sortOrder,
        currentPage,
        pageSize,
        group,
        columnConfig: {
          ...(queryFields ? { queryFields } : {}),
          ...(sortDescriptors ? { sortDescriptors } : {}),
          filterConditionByFilterId
        }
      }),
    [
      currentPage,
      filterConditionByFilterId,
      group,
      pageSize,
      queryFields,
      search,
      selectedFilters,
      sortDescriptors,
      sortField,
      sortOrder
    ]
  )

  const {
    investments,
    total: totalCount,
    listAggregates,
    loading,
    error,
    refetch
  } = useInvestments(accessToken, queryModel.queryVariables, queryModel.queryFields, queryModel.sortDescriptors)

  useEffect(() => {
    if (loading === false && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [loading])
  const isInitialLoading = loading && !initialLoadDone.current

  const sorting = useMemo(() => {
    if (!sortField) return []
    const columnId = Object.entries(sortFieldByColumnId).find(([, field]) => field === sortField)?.[0] || sortField
    return [{ id: columnId, desc: sortOrder === 'DESC' }]
  }, [sortField, sortFieldByColumnId, sortOrder])

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      onSortingChange?.(newSorting)

      if (newSorting.length === 0) {
        setSortField('')
        setSortOrder('DESC')
        setCurrentPage(1)
      } else {
        const first = newSorting[0]
        setSortField(sortFieldByColumnId[first.id] || first.id)
        setSortOrder(first.desc ? 'DESC' : 'ASC')
        setCurrentPage(1)
      }
    },
    [onSortingChange, sortFieldByColumnId]
  )

  const handleVisibleColumnsChange = useCallback(
    (columns: string[]) => {
      setVisibleColumns(columns)
      onVisibleColumnsChange?.(columns)
    },
    [onVisibleColumnsChange]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      setCurrentPage(1)
      onSearchChange?.(value)
    },
    [onSearchChange]
  )

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setCurrentPage(newPagination.pageIndex + 1)
    setPageSize(newPagination.pageSize)
  }, [])

  return {
    investments,
    total: totalCount,
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
