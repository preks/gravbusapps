import { useState, useMemo, useCallback, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import type { InvestmentLead } from '@/common/data/investment/types'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'

interface UseLeadDataReturn {
  // Data
  data: InvestmentLead[]
  total: number
  loading: boolean
  error: Error | null

  // UI State (for DataDisplay)
  search: string
  setSearch: (search: string) => void
  filters: Record<string, any>
  setFilters: (filters: Record<string, any>) => void

  // Table State (for DataTable)
  pagination: { pageIndex: number; pageSize: number }
  setPagination: (pagination: { pageIndex: number; pageSize: number }) => void
  sorting: SortingState
  setSorting: (sorting: SortingState) => void
  selectedRows: InvestmentLead[]
  setSelectedRows: (rows: InvestmentLead[]) => void
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void

  // Data refresh
  refetch: () => void
}

export function useLeadData(context: BusinessAppContextProps): UseLeadDataReturn {
  const { accessToken } = context

  // UI State
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})

  // Clean filters to remove empty arrays and undefined values
  const cleanedFilters = useMemo(() => {
    const cleaned: Record<string, any> = {}
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value
      } else if (!Array.isArray(value) && value !== undefined && value !== null && value !== '') {
        cleaned[key] = value
      }
    })
    return cleaned
  }, [filters])

  // Table State
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [selectedRows, setSelectedRows] = useState<InvestmentLead[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'firstName',
    'email',
    'locality',
    'leadStatus',
    'leadRating',
    'leadSource',
    'ownerEmployee',
    'createdAt'
  ])

  // Track initial loading separately from subsequent operations
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Data fetching
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context)
  const [leads, setLeads] = useState<InvestmentLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Build query variables
  const queryVariables: InvestmentLeadQueryVariables = useMemo(() => {
    const filterVars: Partial<InvestmentLeadQueryVariables> = {}

    // Map cleaned filters to query variables
    if (cleanedFilters.leadStatuses?.length) {
      filterVars.leadStatusIds = cleanedFilters.leadStatuses
    }
    if (cleanedFilters.leadRatings?.length) {
      ;(filterVars as any).leadRatingIds = cleanedFilters.leadRatings
    }
    if (cleanedFilters.leadSources?.length) {
      ;(filterVars as any).leadSourceIds = cleanedFilters.leadSources
    }
    if (cleanedFilters.owners?.length) {
      filterVars.ownerEmployeeIds = cleanedFilters.owners
    }
    if (cleanedFilters.countries?.length) {
      ;(filterVars as any).countryIds = cleanedFilters.countries
    }
    if (cleanedFilters.regions?.length) {
      ;(filterVars as any).regions = cleanedFilters.regions
    }
    if (cleanedFilters.cities?.length) {
      ;(filterVars as any).localities = cleanedFilters.cities
    }
    if (cleanedFilters.createdAfter) {
      filterVars.createdAtFrom = cleanedFilters.createdAfter
    }
    if (cleanedFilters.createdBefore) {
      filterVars.createdAtTo = cleanedFilters.createdBefore
    }
    if (typeof cleanedFilters.sensitive === 'string') {
      filterVars.sensitive = cleanedFilters.sensitive === 'true'
    }

    // Sorting
    const sortField = sorting[0]?.id || 'createdAt'
    const sortOrder = sorting[0]?.desc === false ? 'ASC' : 'DESC'

    return {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: search.trim() || undefined,
      ...(sortField
        ? {
            orderBy: (sortField === 'firstName'
              ? [
                  { field: 'firstName', direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' },
                  { field: 'lastName', direction: 'ASC_NULLS_LAST' },
                  { field: 'companyName', direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }
                ]
              : [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]) as any
          }
        : {}),
      ...filterVars
    }
  }, [search, cleanedFilters, sorting, pagination])

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentLeads(queryVariables)
      setLeads(result.InvestmentLead || [])
      setTotalCount(result.InvestmentLeadAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'))
    } finally {
      setIsLoading(false)
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }, [accessToken, fetchInvestmentLeads, queryVariables, isInitialLoad])

  // Load data when variables change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Handle pagination changes
  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  // Handle sorting changes
  const handleSortingChange = useCallback((newSorting: SortingState) => {
    setSorting(newSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  return {
    // Data
    data: leads,
    total: totalCount,
    loading: isInitialLoad && isLoading,
    error,

    // UI State (for DataDisplay)
    search,
    setSearch,
    filters: cleanedFilters,
    setFilters,

    // Table State (for DataTable)
    pagination,
    setPagination: handlePaginationChange,
    sorting,
    setSorting: handleSortingChange,
    selectedRows,
    setSelectedRows,
    visibleColumns,
    setVisibleColumns,

    // Data refresh
    refetch: loadData
  }
}
