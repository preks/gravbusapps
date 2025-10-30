import { useState, useMemo, useCallback, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'

interface UseOpportunityDataReturn {
  // Data
  data: InvestmentOpportunity[]
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
  selectedRows: InvestmentOpportunity[]
  setSelectedRows: (rows: InvestmentOpportunity[]) => void
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void

  // Data refresh
  refetch: () => void
}

export function useOpportunityData(context: BusinessAppContextProps): UseOpportunityDataReturn {
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
  const [selectedRows, setSelectedRows] = useState<InvestmentOpportunity[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'amount',
    'pipeline',
    'stage',
    'status',
    'closeDate',
    'account',
    'owner',
    'created'
  ])

  // Track initial loading separately from subsequent operations
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Data fetching
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Build query variables
  const queryVariables: InvestmentOpportunityQueryVariables = useMemo(() => {
    const filterVars: Partial<InvestmentOpportunityQueryVariables> = {}

    // Map cleaned filters to query variables
    if (cleanedFilters.owner?.length) {
      filterVars.ownerEmployeeIds = cleanedFilters.owner
    }
    if (cleanedFilters.pipeline?.length) {
      const pipelineIds = cleanedFilters.pipeline.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).opportunityPipelineCodes = pipelineIds
    }
    if (cleanedFilters.stage?.length) {
      const stageIds = cleanedFilters.stage.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).opportunityPipelineStageCodes = stageIds
    }
    if (cleanedFilters.status?.length) {
      const statusIds = cleanedFilters.status.map((id: string) => {
        if (id.includes(':')) return id.split(':').pop()
        return id
      })
      ;(filterVars as any).opportunityStatusCodes = statusIds
    }
    if (cleanedFilters.account?.length) {
      filterVars.accountIds = cleanedFilters.account
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

      const result = await fetchInvestmentOpportunities(queryVariables)

      setOpportunities(result.InvestmentOpportunity || [])
      setTotalCount(result.InvestmentOpportunityAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch opportunities'))
    } finally {
      setIsLoading(false)
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }, [accessToken, queryVariables, fetchInvestmentOpportunities, isInitialLoad])

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
        if (response?.detail?.resolution === 'success' || response?.investmentOpportunity) {
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
    data: opportunities,
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
