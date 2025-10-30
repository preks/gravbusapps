import { useState, useMemo, useCallback, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import type { InvestmentAccount } from '@/common/data/investment/types'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'

interface UseAccountDataReturn {
  // Data
  data: InvestmentAccount[]
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
  selectedRows: InvestmentAccount[]
  setSelectedRows: (rows: InvestmentAccount[]) => void
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void

  // Data refresh
  refetch: () => void
}

export function useAccountData(context: BusinessAppContextProps): UseAccountDataReturn {
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
  const [selectedRows, setSelectedRows] = useState<InvestmentAccount[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'email',
    'geographicPresence',
    'industryClass',
    'legalForm',
    'ownerEmployee',
    'createdAt'
  ])

  // Track initial loading separately from subsequent operations
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Data fetching
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Build query variables
  const queryVariables: InvestmentAccountQueryVariables = useMemo(() => {
    const filterVars: Partial<InvestmentAccountQueryVariables> = {}

    // Map cleaned filters to query variables
    if (cleanedFilters.owner?.length) {
      filterVars.ownerEmployeeIds = cleanedFilters.owner
    }
    if (cleanedFilters.industry?.length) {
      const industries = cleanedFilters.industry.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).industryClassCodes = industries
    }
    if (cleanedFilters.legalForm?.length) {
      const legalForms = cleanedFilters.legalForm.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).legalFormCodes = legalForms
    }
    if (cleanedFilters.companySize?.length) {
      const sizes = cleanedFilters.companySize.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).companySizeCodes = sizes
    }
    if (cleanedFilters.revenueBand?.length) {
      const revenueBands = cleanedFilters.revenueBand.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).accountAnnualRevenueBandCodes = revenueBands
    }

    // Status filters
    if (cleanedFilters.status?.length) {
      cleanedFilters.status.forEach((status: string) => {
        if (status === 'active') (filterVars as any).isActive = true
        if (status === 'inactive') (filterVars as any).isInactive = true
      })
    }

    // Contact info filters
    if (cleanedFilters.contactInfo?.length) {
      cleanedFilters.contactInfo.forEach((filter: string) => {
        if (filter === 'has:email') (filterVars as any).hasEmail = true
        if (filter === 'missing:email') (filterVars as any).missingEmail = true
        if (filter === 'has:phone') (filterVars as any).hasPhone = true
        if (filter === 'missing:phone') (filterVars as any).missingPhone = true
        if (filter === 'has:website') (filterVars as any).hasWebsite = true
        if (filter === 'missing:website') (filterVars as any).missingWebsite = true
      })
    }

    // Build sorting
    const orderBy =
      sorting.length > 0
        ? sorting.map(sort => ({
            field: sort.id,
            direction: sort.desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
          }))
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]

    return {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: search.trim() || undefined,
      orderBy: orderBy as any,
      ...filterVars
    }
  }, [search, cleanedFilters, pagination, sorting])

  // Fetch data
  const loadData = useCallback(async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const result = await fetchInvestmentAccounts(queryVariables)

      setAccounts(result.InvestmentAccount || [])
      setTotalCount(result.InvestmentAccountAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch accounts'))
    } finally {
      setIsLoading(false)
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }, [accessToken, queryVariables, fetchInvestmentAccounts, isInitialLoad])

  // Load data on mount and when query variables change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for process events and refresh data
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        if (event.detail?.resolution === 'success') {
          loadData()
          return
        }

        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investmentAccount) {
          loadData()
          return
        }

        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadData()
        }
      } catch {
        // Silently handle errors
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessEvent as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessEvent as EventListener)
      })
    }
  }, [loadData])

  // Reset to first page when search or filters change
  useEffect(() => {
    if (!isInitialLoad) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [search, cleanedFilters, isInitialLoad])

  return {
    data: accounts,
    total: totalCount,
    loading: isLoading,
    error,

    search,
    setSearch,
    filters,
    setFilters,

    pagination,
    setPagination,
    sorting,
    setSorting,
    selectedRows,
    setSelectedRows,
    visibleColumns,
    setVisibleColumns,

    refetch: loadData
  }
}
