import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useInvestments } from '@/common/data/investment/hooks/useInvestments.new'
import { investmentListQueryConfigForGroup } from '../utils/investmentListQueryConfig'
import type { InvestmentDynamicFilterCondition } from '../utils/investmentListColumnTransformer'

export interface GenericInvestmentSectionStateProps {
  accessToken: string
  groupCode: string
  selectedFilters: Record<string, any>
  defaultVisibleColumns?: string[]
  initialSorting?: Array<{ id: string; desc: boolean }> | null
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  initialVisibleColumns?: string[] | null
  onVisibleColumnsChange?: (columns: string[]) => void
  queryFields?: string[]
  sortFieldByColumnId?: Record<string, string>
  filterConditionByFilterId?: Record<string, InvestmentDynamicFilterCondition>
}

const isEmptyFilterValue = (value: unknown): boolean => {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).every(isEmptyFilterValue)
  return false
}

const getRangeValues = (value: unknown): { min?: unknown; max?: unknown } => {
  if (Array.isArray(value)) {
    return { min: value[0], max: value[1] }
  }

  if (typeof value === 'string') {
    const [min, max] = value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
    return { min, max }
  }

  if (typeof value === 'object' && value !== null) {
    const rangeValue = value as Record<string, unknown>
    return {
      min: rangeValue.min ?? rangeValue.from ?? rangeValue.start ?? rangeValue.startDate,
      max: rangeValue.max ?? rangeValue.to ?? rangeValue.end ?? rangeValue.endDate
    }
  }

  return { min: value }
}

const buildNestedCondition = (path: string, leaf: Record<string, unknown>): Record<string, any> => {
  return path
    .split('.')
    .filter(Boolean)
    .reverse()
    .reduce<Record<string, any>>((condition, segment) => ({ [segment]: condition }), leaf)
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

const buildDynamicFilterCondition = (
  filterMetadata: InvestmentDynamicFilterCondition,
  value: unknown
): Record<string, any> | null => {
  if (isEmptyFilterValue(value) || !filterMetadata.descriptor.path) {
    return null
  }

  let leaf: Record<string, unknown> | null = null

  if (filterMetadata.filterType === 'number') {
    const { min, max } = getRangeValues(value)
    const condition: Record<string, number> = {}
    const parsedMin = min === undefined || min === '' ? undefined : Number(min)
    const parsedMax = max === undefined || max === '' ? undefined : Number(max)

    if (parsedMin !== undefined && Number.isFinite(parsedMin)) condition._gte = parsedMin
    if (parsedMax !== undefined && Number.isFinite(parsedMax)) condition._lte = parsedMax
    leaf = Object.keys(condition).length > 0 ? condition : null
  }

  if (filterMetadata.filterType === 'date') {
    const { min, max } = getRangeValues(value)
    const condition: Record<string, unknown> = {}

    if (min) condition._gte = min
    if (max) condition._lte = max
    leaf = Object.keys(condition).length > 0 ? condition : null
  }

  if (filterMetadata.filterType === 'text') {
    if (Array.isArray(value) && value.length > 0) {
      // Multi-select text filter (options loaded from backend) — use exact _in match
      leaf = { _in: value }
    } else if (typeof value === 'string' && value.trim()) {
      leaf = { _ilike: `%${value.trim().replaceAll('\\', '\\\\').replaceAll('"', '\\"')}%` }
    }
  }

  if (filterMetadata.filterType === 'boolean') {
    const booleanValue = getBooleanFilterValue(value)
    leaf = booleanValue === null ? null : { _eq: booleanValue }
  }

  if (!leaf) {
    return null
  }

  const condition = buildNestedCondition(filterMetadata.descriptor.path, leaf)
  return filterMetadata.relationField ? { [filterMetadata.relationField]: condition } : condition
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
  selectedFilters,
  defaultVisibleColumns,
  initialSorting,
  onSortingChange,
  initialVisibleColumns,
  onVisibleColumnsChange,
  queryFields,
  sortFieldByColumnId = {},
  filterConditionByFilterId = {}
}: GenericInvestmentSectionStateProps) => {
  const initialSort = initialSorting?.[0]
  // Local UI state (mirrors useInvestmentSectionState)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState(initialSort ? sortFieldByColumnId[initialSort.id] || initialSort.id : '')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>(initialSort?.desc === false ? 'ASC' : 'DESC')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(initialVisibleColumns ?? DEFAULT_VISIBLE_COLUMNS)
  const initialLoadDone = useRef(false)
  const visibleColumnsInitializedForGroup = useRef<string | null>(null)
  const sortingInitializedForGroup = useRef<string | null>(null)

  useEffect(() => {
    if (!groupCode) {
      return
    }

    if (visibleColumnsInitializedForGroup.current === groupCode) {
      return
    }

    setVisibleColumns(initialVisibleColumns ?? defaultVisibleColumns ?? DEFAULT_VISIBLE_COLUMNS)
    visibleColumnsInitializedForGroup.current = groupCode
  }, [defaultVisibleColumns, groupCode, initialVisibleColumns])

  useEffect(() => {
    if (!groupCode || sortingInitializedForGroup.current === groupCode) {
      return
    }

    const firstSort = initialSorting?.[0]
    setSortField(firstSort ? sortFieldByColumnId[firstSort.id] || firstSort.id : '')
    setSortOrder(firstSort?.desc === false ? 'ASC' : 'DESC')
    sortingInitializedForGroup.current = groupCode
  }, [groupCode, initialSorting, sortFieldByColumnId])

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
    const normalizedSelectedFilters = normalizePlanedExitFilter(selectedFilters)
    const existingConditions: Record<string, any>[] = normalizedSelectedFilters.customConditions ?? []
    const dynamicFilterIds = new Set(Object.keys(filterConditionByFilterId))
    const dynamicFilterConditions = Object.entries(filterConditionByFilterId)
      .map(([filterId, filterMetadata]) =>
        buildDynamicFilterCondition(filterMetadata, normalizedSelectedFilters[filterId])
      )
      .filter((condition): condition is Record<string, any> => Boolean(condition))
    const listFilters = Object.fromEntries(
      Object.entries(normalizedSelectedFilters).filter(
        ([key]) => key !== 'currencyIds' && key !== 'customConditions' && !dynamicFilterIds.has(key)
      )
    )
    const mergedConditions = [
      ...groupCondition,
      ...existingConditions,
      ...currencyConditions,
      ...dynamicFilterConditions
    ]
    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }],
      ...listFilters,
      ...investmentTypeFilter,
      customConditions: mergedConditions.length > 0 ? [{ _and: mergedConditions }] : []
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
    investmentTypeFilter,
    filterConditionByFilterId
  ])

  const listQueryConfig = useMemo(
    () => (queryFields && queryFields.length > 0 ? queryFields : investmentListQueryConfigForGroup(groupCode)),
    [groupCode, queryFields]
  )

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
    const columnId = Object.entries(sortFieldByColumnId).find(([, field]) => field === sortField)?.[0] || sortField
    return [{ id: columnId, desc: sortOrder === 'DESC' }]
  }, [sortField, sortFieldByColumnId, sortOrder])

  // Pagination format expected by DataDisplay
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
    setVisibleColumns: handleVisibleColumnsChange,
    sorting,
    pagination,
    isInitialLoading,
    handleSortingChange,
    handlePaginationChange
  }
}
