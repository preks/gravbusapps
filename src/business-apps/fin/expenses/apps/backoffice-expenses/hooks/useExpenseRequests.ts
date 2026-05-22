import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_REQUESTS, PROCESS_PAYMENT_MUTATION } from '../queries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { TranslateFn } from '../utils/utils'
import { extractUniqueStatuses, extractUniqueEmployees } from '../utils/sharedUtils'
import { buildBackofficeExpenseRequestOrderBy } from '../components/tabs/expence-requests-tab/config/backofficeExpenseRequestOrderBy'
import type { ExpenseRequestListSortField } from '../components/tabs/expence-requests-tab/config/expenseRequestListSortTypes'
import { useBackofficeExpenseRequestsOverviewData } from './useBackofficeExpenseRequestsOverviewData'

export type { ExpenseRequestListSortField } from '../components/tabs/expence-requests-tab/config/expenseRequestListSortTypes'

export const useExpenseRequests = (context: BusinessAppContextProps, t: TranslateFn, isActive: boolean = true) => {
  const { accessToken } = context
  const client = useGraphqlClient(accessToken)

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)

  // Single source of truth for sorting state
  const [sorting, setSorting] = useState<{
    field: ExpenseRequestListSortField | null
    order: 'ASC' | 'DESC' | null
    lastField: ExpenseRequestListSortField | null
  }>({ field: 'createdAt', order: 'DESC', lastField: 'createdAt' })

  // Derived orderBy for the data hook
  const [orderBy, setOrderBy] = useState<unknown[]>([{ createdAt: 'DESC' }])

  useEffect(() => {
    setOrderBy(buildBackofficeExpenseRequestOrderBy(sorting.field, sorting.order))
  }, [sorting.field, sorting.order])

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [employeeFilter, setEmployeeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('BOOKED')
  const [amountMinFilter, setAmountMinFilter] = useState<string>('')
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('')
  const [remainingMinFilter, setRemainingMinFilter] = useState<string>('')
  const [remainingMaxFilter, setRemainingMaxFilter] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [currencyRefFilter, setCurrencyRefFilter] = useState<string>('')
  const [effectiveDateRangeFilter, setEffectiveDateRangeFilter] = useState<{
    from?: string
    to?: string
  } | null>(null)
  const [requestDateRangeFilter, setRequestDateRangeFilter] = useState<{
    from?: string
    to?: string
  } | null>(null)
  const [requestTypeFilter, setRequestTypeFilter] = useState<string[]>([])

  // --- Data fetching (delegated) ---
  const { expenses, totalItems, loading, error, fetchData } = useBackofficeExpenseRequestsOverviewData({
    accessToken,
    t,
    isActive,
    searchTerm,
    employeeFilter,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
    remainingMinFilter,
    remainingMaxFilter,
    departmentFilter,
    currencyRefFilter,
    effectiveDateRangeFilter,
    requestDateRangeFilter,
    requestTypeFilter,
    currentPage,
    pageSize,
    orderBy
  })

  // --- Sorting handlers ---

  const updateSorting = useCallback(
    (field: ExpenseRequestListSortField) => {
      let order: 'ASC' | 'DESC' = 'ASC'
      if (sorting.lastField === field && sorting.order) {
        order = sorting.order === 'ASC' ? 'DESC' : 'ASC'
      }
      setSorting({ field, order, lastField: field })
      setCurrentPage(1)
    },
    [sorting.lastField, sorting.order]
  )

  const applySorting = useCallback((field: ExpenseRequestListSortField | null, order: 'ASC' | 'DESC' | null) => {
    setSorting(prev => {
      if (prev.field === field && prev.order === order) {
        return prev
      }
      return { field, order, lastField: field }
    })
  }, [])

  // --- Filter handlers ---

  const handleSearch = useCallback(
    (value: string) => {
      if (value === searchTerm) {
        return
      }
      setSearchTerm(value)
      setCurrentPage(1)
    },
    [searchTerm]
  )

  const handleEmployeeFilter = useCallback((employeeIds: string) => {
    setEmployeeFilter(employeeIds)
    setCurrentPage(1)
  }, [])

  const handleStatusFilter = useCallback((statuses: string) => {
    setStatusFilter(statuses)
    setCurrentPage(1)
  }, [])

  const handleAmountFilter = useCallback((amountMin: string, amountMax: string) => {
    setAmountMinFilter(amountMin)
    setAmountMaxFilter(amountMax)
    setCurrentPage(1)
  }, [])

  const handleRemainingAmountFilter = useCallback((remainingMin: string, remainingMax: string) => {
    setRemainingMinFilter(remainingMin)
    setRemainingMaxFilter(remainingMax)
    setCurrentPage(1)
  }, [])

  const handleDepartmentFilter = useCallback((departmentId: string) => {
    setDepartmentFilter(departmentId)
    setCurrentPage(1)
  }, [])

  const handleCurrencyFilter = useCallback((currencyRef: string) => {
    setCurrencyRefFilter(currencyRef)
    setCurrentPage(1)
  }, [])

  // --- Legacy handlers (kept for backward compatibility) ---

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
    if (sorter) {
      applyOrderBy(Array.isArray(sorter) ? sorter : [sorter])
    }
  }

  const handleSortChange = useCallback((columnKey: string, direction: 'ASC' | 'DESC') => {
    setSorting(prev => ({
      field: columnKey as ExpenseRequestListSortField,
      order: direction,
      lastField: prev.field
    }))
    setCurrentPage(1)
  }, [])

  const applyOrderBy = useCallback((newOrderBy: any[]) => {
    if (newOrderBy.length > 0) {
      const firstOrder = newOrderBy[0]
      const field = Object.keys(firstOrder)[0] as ExpenseRequestListSortField
      const order = firstOrder[field] as 'ASC' | 'DESC'
      setSorting(prev => ({
        field,
        order,
        lastField: prev.field
      }))
    }
    setCurrentPage(1)
  }, [])

  // --- Side-effect actions ---

  const processExpensePayment = async (id: string) => {
    if (!client) return false
    try {
      await client.request(PROCESS_PAYMENT_MUTATION, { id })
      await fetchData()
      return true
    } catch {
      return false
    }
  }

  const searchEmployees = useCallback(
    async (searchTerm: string): Promise<Array<{ id: string; name: string }>> => {
      if (!accessToken || !client || !searchTerm.trim()) return []

      try {
        const searchValue = `%${searchTerm.trim()}%`
        const data = await client.request(GET_EXPENSE_REQUESTS, {
          where: {
            _and: [
              { isDeleted: { _eq: false } },
              { status: { _neq: 'DISCARDED' } },
              {
                _or: [
                  { employee: { firstName: { _ilike: searchValue } } },
                  { employee: { lastName: { _ilike: searchValue } } }
                ]
              }
            ]
          },
          limit: 1000,
          offset: 0
        })

        return extractUniqueEmployees(data?.ExpenseRequest || [], (request: any) => request.employee, searchTerm)
      } catch {
        return []
      }
    },
    [client, accessToken]
  )

  const searchStatuses = useCallback(async (): Promise<string[]> => {
    if (!accessToken || !client) return []
    try {
      const data = await client.request(GET_EXPENSE_REQUESTS, {
        where: { _and: [{ isDeleted: { _eq: false } }, { status: { _neq: 'DISCARDED' } }] },
        limit: 1000,
        offset: 0
      })
      return extractUniqueStatuses(data?.ExpenseRequest || [], ['DISCARDED'])
    } catch {
      return []
    }
  }, [client, accessToken])

  return {
    expenses,
    totalItems,
    loading,
    error,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    searchTerm,
    fetchData,
    searchEmployees,
    searchStatuses,
    sorting,
    updateSorting,
    applySorting,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleTableChange,
    handleSearch,
    handleSortChange,
    applyOrderBy,
    amountMinFilter,
    amountMaxFilter,
    remainingMinFilter,
    remainingMaxFilter,
    handleRemainingAmountFilter,
    processExpensePayment,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setRequestTypeFilter
  }
}
