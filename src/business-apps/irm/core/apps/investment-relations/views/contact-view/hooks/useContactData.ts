import { useState, useMemo, useCallback, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'

interface UseContactDataReturn {
  // Data
  data: InvestmentContact[]
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
  selectedRows: InvestmentContact[]
  setSelectedRows: (rows: InvestmentContact[]) => void
  visibleColumns: string[]
  setVisibleColumns: (columns: string[]) => void

  // Data refresh
  refetch: () => void
}

export function useContactData(context: BusinessAppContextProps): UseContactDataReturn {
  const { accessToken } = context

  // UI State
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})

  // Clean filters to remove empty arrays and undefined values
  const cleanedFilters = useMemo(() => {
    const cleaned: Record<string, any> = {}
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value) && value.length > 0) {
        cleaned[key] = value
      } else if (!Array.isArray(value) && value !== undefined && value !== null && value !== '') {
        cleaned[key] = value
      }
    }
    return cleaned
  }, [filters])

  // Table State
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [selectedRows, setSelectedRows] = useState<InvestmentContact[]>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'firstName',
    'email',
    'type',
    'jobPosition',
    'department',
    'ownerEmployee',
    'createdAt'
  ])

  // Track initial loading separately from subsequent operations
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Data fetching
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)
  const [contacts, setContacts] = useState<InvestmentContact[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Build query variables
  const queryVariables: InvestmentContactQueryVariables = useMemo(() => {
    const filterVars: Partial<InvestmentContactQueryVariables> = {}

    // Map cleaned filters to query variables
    if (cleanedFilters.owner?.length) {
      filterVars.ownerEmployeeIds = cleanedFilters.owner
    }
    if (cleanedFilters.contactType?.length) {
      filterVars.contactTypes = cleanedFilters.contactType
    }
    if (cleanedFilters.account?.length) {
      filterVars.accountIds = cleanedFilters.account
    }

    // Contact info filters
    if (cleanedFilters.communicationChannels?.length) {
      for (const filter of cleanedFilters.communicationChannels) {
        if (filter === 'has:email') filterVars.hasEmail = true
        if (filter === 'missing:email') filterVars.missingEmail = true
        if (filter === 'has:phone') filterVars.hasPhone = true
        if (filter === 'missing:phone') filterVars.missingPhone = true
      }
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

      const result = await fetchInvestmentContacts(queryVariables)

      setContacts(result.InvestmentContact || [])
      setTotalCount(result.InvestmentContactAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contacts'))
    } finally {
      setIsLoading(false)
      if (isInitialLoad) {
        setIsInitialLoad(false)
      }
    }
  }, [accessToken, queryVariables, fetchInvestmentContacts, isInitialLoad])

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
        if (response?.detail?.resolution === 'success' || response?.investmentContact) {
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

    for (const eventName of eventNames) {
      globalThis.addEventListener(eventName, handleProcessEvent as EventListener)
    }

    return () => {
      for (const eventName of eventNames) {
        globalThis.removeEventListener(eventName, handleProcessEvent as EventListener)
      }
    }
  }, [loadData])

  // Reset to first page when search or filters change
  useEffect(() => {
    if (!isInitialLoad) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }
  }, [search, cleanedFilters, isInitialLoad])

  return {
    data: contacts,
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
