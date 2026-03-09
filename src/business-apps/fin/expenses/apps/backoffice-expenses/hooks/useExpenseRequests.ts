import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_REQUESTS, PROCESS_PAYMENT_MUTATION } from '../queries'
import { ExpenseData, ExpenseRequestQueryData } from '../types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDateLocalized } from '../utils/dateUtils'
import {
  buildNumericRangeCondition,
  buildSearchCondition as buildSearchConditionBase,
  buildExpenseRequestSearchOrConditions,
  buildStatusFilterCondition,
  buildEmployeeFilterCondition
} from './queryFilterUtils'
import { buildRequestEffectiveDateFilter, buildRequestTypeFilter } from './backofficeSharedOverview'

export const useExpenseRequests = (context: BusinessAppContextProps, isActive: boolean = true) => {
  const { accessToken } = context
  const client = useGraphqlClient(accessToken)

  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalItems, setTotalItems] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)

  // Request deduplication - prevent duplicate queries
  const lastRequestKey = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)

  type SortField =
    | 'title'
    | 'startDate'
    | 'endDate'
    | 'createdAt'
    | 'status'
    | 'totalAmount'
    | 'totalRemainingAmount'
    | 'employee.fullName'
    | 'employee.code'
    | 'code'

  // Single source of truth for sorting state
  const [sorting, setSorting] = useState<{
    field: SortField
    order: 'ASC' | 'DESC'
    lastField: SortField
  }>({ field: 'createdAt', order: 'DESC', lastField: 'createdAt' })

  // Derived state - kept for backward compatibility with existing code
  const [sorter, setSorter] = useState<any[]>([{ createdAt: 'DESC' }])

  const mapSortToOrderBy = useCallback((field: SortField, order: 'ASC' | 'DESC'): any[] => {
    switch (field) {
      case 'title':
        return [{ title: order }, { id: order }]
      case 'startDate':
        return [{ startDate: order }, { id: order }]
      case 'endDate':
        return [{ endDate: order }, { id: order }]
      case 'createdAt':
        return [{ createdAt: order }, { id: order }]
      case 'status':
        return [{ status: order }, { id: order }]
      case 'totalAmount':
        return [{ reimbursableAmount: order }, { id: order }]
      case 'totalRemainingAmount':
        return [{ totalRemainingAmount: order }, { id: order }]
      case 'employee.fullName':
        // Align with manager expenses: sort by firstName and lastName to emulate fullName, then tie-break by id
        return [{ employee: { firstName: order } }, { employee: { lastName: order } }, { id: order }]
      case 'employee.code':
        return [{ employee: { code: order } }, { id: order }]
      case 'code':
        return [{ code: order }, { id: order }]
      default:
        return [{ createdAt: 'DESC' }]
    }
  }, [])

  // Keep sorter synchronized with sorting state
  useEffect(() => {
    setSorter(mapSortToOrderBy(sorting.field, sorting.order))
  }, [sorting.field, sorting.order, mapSortToOrderBy])

  const updateSorting = useCallback(
    (field: SortField) => {
      // Determine sort order: toggle if same field, default to ASC for new field
      let order: 'ASC' | 'DESC' = 'ASC'
      if (sorting.lastField === field) {
        order = sorting.order === 'ASC' ? 'DESC' : 'ASC'
      }

      const next = {
        field,
        order,
        lastField: field
      } as { field: SortField; order: 'ASC' | 'DESC'; lastField: SortField }
      setSorting(next)
      setCurrentPage(1)
    },
    [sorting.lastField, sorting.order]
  )

  const [searchTerm, setSearchTerm] = useState<string>('')
  const [employeeFilter, setEmployeeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('BOOKED')
  const [amountMinFilter, setAmountMinFilter] = useState<string>('')
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [currencyRefFilter, setCurrencyRefFilter] = useState<string>('')
  const [startDateRangeFilter, setStartDateRangeFilter] = useState<{
    from?: string
    to?: string
  }>({})
  const [endDateRangeFilter, setEndDateRangeFilter] = useState<{
    from?: string
    to?: string
  }>({})
  // New date range filters - matching manager/personal pattern
  const [effectiveDateRangeFilter, setEffectiveDateRangeFilter] = useState<{
    from?: string
    to?: string
  } | null>(null)
  const [requestDateRangeFilter, setRequestDateRangeFilter] = useState<{
    from?: string
    to?: string
  } | null>(null)
  // Request type filter (EXPENSES, TRIP)
  const [requestTypeFilter, setRequestTypeFilter] = useState<string[]>([])

  const transformExpenseRequest = (item: any): ExpenseData => {
    return {
      id: item.id,
      expenseId: String(item.id ?? '-'),
      employeeCode: item.employee?.code ?? '-',
      code: item.code ?? '-',
      sapNumber: item.employee?.hrReferenceCode ?? '-',
      employee: `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || '-',
      title: item.title ?? '-',
      creationDate: formatDateLocalized(item.createdAt),
      startDate: formatDateLocalized(item.startDate),
      endDate: formatDateLocalized(item.endDate),
      requestDate: formatDateLocalized(item.createdAt),
      reporter: `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || '-',
      type: item.requestType?.value ?? '-',
      amount: item.reimbursableAmount ? `${item.reimbursableAmount} ${item.currency?.code ?? ''}`.trim() : '-',
      advance: '',
      status: item.status ?? '',
      payableAmount: item.reimbursableAmount ? `${item.reimbursableAmount} ${item.currency?.code ?? ''}`.trim() : '-',
      paymentMethod: '-',
      employeeId: String(item.employee?.id ?? '-'),
      version: item.version ?? '',
      currency: { code: item.currency?.code ?? '' },
      currencyRef: item.currencyRef ?? '',
      typeRef: '',
      requestTypeRef: item.requestTypeRef ?? '',
      totalRemainingAmount: item.totalRemainingAmount ?? '-',
      userId: '',
      expenseRuleId: '',
      totalAmount: item.reimbursableAmount ?? 0,
      employeeDocumentId: item.employeeDocumentId ?? null,
      documentData: null,
      employeeDocument: item.employeeDocument,
      department: item.employee?.employeePosition?.costCenter?.name ?? 'N/A',
      nonReimbursableAmount: item.nonReimbursableAmount,
      expensePlan: item.expensePlan
    }
  }

  // Helper: Build amount filter condition (reduces cognitive complexity)
  const buildAmountFilterCondition = (amountMin?: string, amountMax?: string): any[] => {
    return buildNumericRangeCondition(amountMin, amountMax, amountConditions => ({
      reimbursableAmount: amountConditions
    }))
  }

  // Helper: Build date range filter conditions (reduces cognitive complexity)
  const buildDateRangeFilterConditions = (
    startDateRange: { from?: string; to?: string },
    endDateRange: { from?: string; to?: string }
  ): any[] => {
    const conditions: any[] = []

    if (startDateRange.from || startDateRange.to) {
      const rangeCond: any = {}
      if (startDateRange.from) rangeCond._gte = startDateRange.from
      if (startDateRange.to) rangeCond._lte = startDateRange.to
      conditions.push({ startDate: rangeCond })
    }

    if (endDateRange.from || endDateRange.to) {
      const rangeCond: any = {}
      if (endDateRange.from) rangeCond._gte = endDateRange.from
      if (endDateRange.to) rangeCond._lte = endDateRange.to
      conditions.push({ endDate: rangeCond })
    }

    return conditions
  }

  const buildSearchCondition = (searchTerm: string): any[] => {
    return buildSearchConditionBase(searchTerm, buildExpenseRequestSearchOrConditions)
  }

  // Helper: Build complete where conditions from all filters (reduces cognitive complexity)
  // Refactored to use options object to avoid too many parameters
  const buildWhereConditions = useCallback(
    (options: {
      statusFilter: string
      employeeFilter: string
      amountMinFilter: string
      amountMaxFilter: string
      startDateRangeFilter: { from?: string; to?: string }
      endDateRangeFilter: { from?: string; to?: string }
      searchTerm: string
      departmentFilter: string
      currencyRefFilter: string
      effectiveDateRangeFilter: { from?: string; to?: string } | null
      requestDateRangeFilter: { from?: string; to?: string } | null
      requestTypeFilter: string[]
    }): any => {
      const {
        statusFilter,
        employeeFilter,
        amountMinFilter,
        amountMaxFilter,
        startDateRangeFilter,
        endDateRangeFilter,
        searchTerm,
        departmentFilter,
        currencyRefFilter,
        effectiveDateRangeFilter,
        requestDateRangeFilter,
        requestTypeFilter
      } = options

      // Build conditions array using extracted helper functions
      const conditions: any[] = [
        { isDeleted: { _eq: false } },
        { status: { _nin: ['DISCARDED', 'CREATED'] } },
        ...buildStatusFilterCondition(statusFilter),
        ...buildEmployeeFilterCondition(employeeFilter),
        ...buildAmountFilterCondition(amountMinFilter, amountMaxFilter),
        ...buildDateRangeFilterConditions(startDateRangeFilter, endDateRangeFilter),
        ...buildSearchCondition(searchTerm)
      ]

      // Add department filter if provided
      if (departmentFilter && departmentFilter !== '') {
        conditions.push({
          employee: { employeePosition: { organizationalUnitId: { _eq: departmentFilter } } }
        })
      }

      // Add currency filter if provided
      if (currencyRefFilter && currencyRefFilter !== '') {
        conditions.push({ currencyRef: { _eq: currencyRefFilter } })
      }

      // Add effective date filter if provided
      const effectiveDateFilter = buildRequestEffectiveDateFilter(effectiveDateRangeFilter)
      if (effectiveDateFilter) {
        conditions.push(effectiveDateFilter)
      }

      // Add request date range filter if provided
      if (requestDateRangeFilter?.from || requestDateRangeFilter?.to) {
        const requestDateCond: any = {}
        if (requestDateRangeFilter.from) requestDateCond._gte = requestDateRangeFilter.from
        if (requestDateRangeFilter.to) requestDateCond._lte = requestDateRangeFilter.to
        conditions.push({ requestDate: requestDateCond })
      }

      // Add request type filter if provided
      const requestTypeFilterCond = buildRequestTypeFilter(requestTypeFilter)
      if (requestTypeFilterCond) {
        conditions.push(requestTypeFilterCond)
      }

      return conditions.length === 1 ? conditions[0] : { _and: conditions }
    },
    [buildRequestEffectiveDateFilter, buildRequestTypeFilter]
  )

  const fetchData = async (force: boolean = false) => {
    if (!accessToken || !client) {
      setError('Access token and GraphQL client are required.')
      setLoading(false)
      return
    }

    // Build request key from all parameters that affect the query
    const requestKey = JSON.stringify({
      page: currentPage,
      pageSize,
      searchTerm,
      employeeFilter,
      statusFilter,
      amountMinFilter,
      amountMaxFilter,
      departmentFilter,
      currencyRefFilter,
      startDateRange: startDateRangeFilter,
      endDateRange: endDateRangeFilter,
      effectiveDateRange: effectiveDateRangeFilter,
      requestDateRange: requestDateRangeFilter,
      requestTypeFilter,
      sorter
    })

    // Enhanced deduplication: check if same request OR already loading
    // Skip deduplication if force is true (e.g., after transfer operations)
    if (!force && requestKey === lastRequestKey.current) {
      return
    }

    if (!force && isLoadingRef.current) {
      return
    }

    lastRequestKey.current = requestKey
    isLoadingRef.current = true

    setLoading(true)
    setError(null)

    try {
      // Build where conditions using helper function
      const baseWhere = buildWhereConditions({
        statusFilter,
        employeeFilter,
        amountMinFilter,
        amountMaxFilter,
        startDateRangeFilter,
        endDateRangeFilter,
        searchTerm,
        departmentFilter,
        currencyRefFilter,
        effectiveDateRangeFilter,
        requestDateRangeFilter,
        requestTypeFilter
      })

      const limit = Math.min(pageSize, 1000)
      const offset = (currentPage - 1) * limit

      const variables = {
        where: baseWhere,
        limit,
        offset,
        orderBy: Array.isArray(sorter) ? sorter : [sorter]
      }

      const response = await client.request(GET_EXPENSE_REQUESTS, variables)
      const responseData = response as ExpenseRequestQueryData

      if (responseData?.ExpenseRequest) {
        const transformedData = responseData.ExpenseRequest.map(transformExpenseRequest)
        setExpenses(transformedData)
      } else {
        setExpenses([])
      }

      setTotalItems(responseData.total.aggregate.count ?? 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expense requests. Please try again later.')
      setExpenses([])
      setTotalItems(0)
    } finally {
      setLoading(false)
      isLoadingRef.current = false // Reset loading ref
    }
  }

  // ⚡ PERFORMANCE OPTIMIZATION: Add debouncing for search and filters
  useEffect(() => {
    // Only fetch when tab is active
    if (accessToken && client && isActive) {
      fetchData()
    }
  }, [
    accessToken,
    client,
    currentPage,
    pageSize,
    searchTerm,
    employeeFilter,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentFilter,
    currencyRefFilter,
    startDateRangeFilter.from,
    startDateRangeFilter.to,
    endDateRangeFilter.from,
    endDateRangeFilter.to,
    effectiveDateRangeFilter?.from,
    effectiveDateRangeFilter?.to,
    requestDateRangeFilter?.from,
    requestDateRangeFilter?.to,
    JSON.stringify(requestTypeFilter),
    JSON.stringify(sorter),
    isActive
  ])

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
    if (sorter) {
      setSorter(Array.isArray(sorter) ? sorter : [sorter])
    }
  }

  const handleSortChange = useCallback((columnKey: string, direction: 'ASC' | 'DESC') => {
    // Map columnKey to SortField and update sorting state
    setSorting(prev => ({
      field: columnKey as SortField,
      order: direction,
      lastField: prev.field
    }))
    setCurrentPage(1)
  }, [])

  const setOrderBy = useCallback((orderBy: any[]) => {
    // Extract field and order from orderBy array and update sorting state
    if (orderBy.length > 0) {
      const firstOrder = orderBy[0]
      const field = Object.keys(firstOrder)[0] as SortField
      const order = firstOrder[field] as 'ASC' | 'DESC'
      setSorting(prev => ({
        field,
        order,
        lastField: prev.field
      }))
    }
    setCurrentPage(1)
  }, [])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

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

  const handleDepartmentFilter = useCallback((departmentId: string) => {
    setDepartmentFilter(departmentId)
    setCurrentPage(1)
  }, [])

  const handleCurrencyFilter = useCallback((currencyRef: string) => {
    setCurrencyRefFilter(currencyRef)
    setCurrentPage(1)
  }, [])

  const handleStartDateRangeFilter = useCallback((from?: string, to?: string) => {
    setStartDateRangeFilter({ from, to })
    setCurrentPage(1)
  }, [])

  const handleEndDateRangeFilter = useCallback((from?: string, to?: string) => {
    setEndDateRangeFilter({ from, to })
    setCurrentPage(1)
  }, [])

  const processExpensePayment = async (id: string) => {
    if (!client) return false
    setError(null)
    try {
      await client.request(PROCESS_PAYMENT_MUTATION, { id })
      await fetchData() // Refresh data after payment processing
      return true
    } catch {
      setError('Failed to process expense payment.')
      return false
    }
  }

  // Search employees method
  const searchEmployees = useCallback(
    async (searchTerm: string): Promise<Array<{ id: string; name: string }>> => {
      if (!accessToken) {
        return []
      }

      if (!client) {
        return []
      }

      if (!searchTerm.trim()) {
        return []
      }

      try {
        const searchValue = `%${searchTerm.trim()}%`
        const variables = {
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
        }

        const data = await client.request(GET_EXPENSE_REQUESTS, variables)

        const employees = new Map<string, { id: string; name: string }>()
        const searchLower = searchTerm.trim().toLowerCase()

        data?.ExpenseRequest?.forEach((request: any) => {
          if (request.employee) {
            const firstName = request.employee.firstName || ''
            const lastName = request.employee.lastName || ''
            const displayName = request.employee.displayName || ''
            const employeeId = request.employee.id

            const fullName = `${firstName} ${lastName}`.trim()

            const matchesSearch =
              fullName.toLowerCase().includes(searchLower) ||
              displayName.toLowerCase().includes(searchLower) ||
              firstName.toLowerCase().includes(searchLower) ||
              lastName.toLowerCase().includes(searchLower)

            if (fullName && matchesSearch && employeeId) {
              employees.set(employeeId, { id: employeeId, name: fullName })
            }
            if (displayName && matchesSearch && employeeId) {
              employees.set(employeeId, { id: employeeId, name: displayName })
            }
          }
        })

        const result = Array.from(employees.values()).sort((a, b) => a.name.localeCompare(b.name))
        return result
      } catch {
        return []
      }
    },
    [client, accessToken]
  )

  // Search statuses method
  const searchStatuses = useCallback(async (): Promise<string[]> => {
    if (!accessToken) {
      return []
    }

    if (!client) {
      return []
    }

    try {
      const variables = {
        where: {
          _and: [{ isDeleted: { _eq: false } }, { status: { _neq: 'DISCARDED' } }]
        },
        limit: 1000,
        offset: 0
      }

      const data = await client.request(GET_EXPENSE_REQUESTS, variables)

      const statuses = new Set<string>()
      data?.ExpenseRequest?.forEach((request: any) => {
        if (request.status) {
          statuses.add(request.status)
        }
      })

      const result = Array.from(statuses).sort()
      return result
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
    searchTerm,
    fetchData,
    searchEmployees,
    searchStatuses,
    sorting,
    updateSorting,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleStartDateRangeFilter,
    handleEndDateRangeFilter,
    handleTableChange,
    handleSearch,
    handleSortChange,
    setOrderBy,
    amountMinFilter,
    amountMaxFilter,
    processExpensePayment,
    // New filter setters
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setRequestTypeFilter
  }
}
