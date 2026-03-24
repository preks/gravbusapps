import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_REQUESTS } from '../queries'
import { ExpenseData, ExpenseRequestQueryData } from '../types'
import type { TranslateFn } from '../utils/utils'
import { mapExpenseRequest } from '../components/tabs/expence-requests-tab/data/mapExpenseRequest'
import {
  buildNumericRangeCondition,
  buildSearchCondition as buildSearchConditionBase,
  buildExpenseRequestSearchOrConditions,
  buildStatusFilterCondition,
  buildEmployeeFilterCondition
} from './queryFilterUtils'
import { buildRequestEffectiveDateFilter, buildRequestTypeFilter } from './backofficeSharedOverview'

export interface BackofficeExpenseRequestsOverviewParams {
  accessToken: string
  t: TranslateFn
  isActive: boolean
  searchTerm: string
  employeeFilter: string
  statusFilter: string
  amountMinFilter: string
  amountMaxFilter: string
  departmentFilter: string
  currencyRefFilter: string
  effectiveDateRangeFilter: { from?: string; to?: string } | null
  requestDateRangeFilter: { from?: string; to?: string } | null
  requestTypeFilter: string[]
  currentPage: number
  pageSize: number
  orderBy: unknown[]
}

function buildAmountFilterCondition(amountMin?: string, amountMax?: string): any[] {
  return buildNumericRangeCondition(amountMin, amountMax, amountConditions => ({
    reimbursableAmount: amountConditions
  }))
}

function buildSearchCondition(searchTerm: string): any[] {
  return buildSearchConditionBase(searchTerm, buildExpenseRequestSearchOrConditions)
}

function buildWhereConditions(
  options: Pick<
    BackofficeExpenseRequestsOverviewParams,
    | 'statusFilter'
    | 'employeeFilter'
    | 'amountMinFilter'
    | 'amountMaxFilter'
    | 'searchTerm'
    | 'departmentFilter'
    | 'currencyRefFilter'
    | 'effectiveDateRangeFilter'
    | 'requestDateRangeFilter'
    | 'requestTypeFilter'
  >
): any {
  const {
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    searchTerm,
    departmentFilter,
    currencyRefFilter,
    effectiveDateRangeFilter,
    requestDateRangeFilter,
    requestTypeFilter
  } = options

  const activeStatuses = statusFilter
    ? statusFilter
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : []
  const excludedStatuses = ['DISCARDED']
  if (!activeStatuses.includes('CREATED')) excludedStatuses.push('CREATED')

  const conditions: any[] = [
    { isDeleted: { _eq: false } },
    { status: { _nin: excludedStatuses } },
    ...buildStatusFilterCondition(statusFilter),
    ...buildEmployeeFilterCondition(employeeFilter),
    ...buildAmountFilterCondition(amountMinFilter, amountMaxFilter),
    ...buildSearchCondition(searchTerm)
  ]

  if (departmentFilter) {
    const departmentIds = departmentFilter
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (departmentIds.length === 1) {
      conditions.push({
        employee: { employeePosition: { organizationalUnitId: { _eq: departmentIds[0] } } }
      })
    }
    if (departmentIds.length > 1) {
      conditions.push({
        employee: { employeePosition: { organizationalUnitId: { _in: departmentIds } } }
      })
    }
  }

  if (currencyRefFilter) {
    conditions.push({ currencyRef: { _eq: currencyRefFilter } })
  }

  const effectiveDateFilter = buildRequestEffectiveDateFilter(effectiveDateRangeFilter)
  if (effectiveDateFilter) {
    conditions.push(effectiveDateFilter)
  }

  if (requestDateRangeFilter?.from || requestDateRangeFilter?.to) {
    const createdAtCond: any = {}
    if (requestDateRangeFilter.from) createdAtCond._gte = requestDateRangeFilter.from
    if (requestDateRangeFilter.to) createdAtCond._lte = requestDateRangeFilter.to
    conditions.push({ createdAt: createdAtCond })
  }

  const requestTypeFilterCond = buildRequestTypeFilter(requestTypeFilter)
  if (requestTypeFilterCond) {
    conditions.push(requestTypeFilterCond)
  }

  return conditions.length === 1 ? conditions[0] : { _and: conditions }
}

export function useBackofficeExpenseRequestsOverviewData(params: BackofficeExpenseRequestsOverviewParams) {
  const {
    accessToken,
    t,
    isActive,
    searchTerm,
    employeeFilter,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentFilter,
    currencyRefFilter,
    effectiveDateRangeFilter,
    requestDateRangeFilter,
    requestTypeFilter,
    currentPage,
    pageSize,
    orderBy
  } = params

  const client = useGraphqlClient(accessToken)

  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [totalItems, setTotalItems] = useState<number>(0)

  const lastRequestKey = useRef<string>('')
  const isLoadingRef = useRef<boolean>(false)
  const expensesRef = useRef<ExpenseData[]>([])

  useEffect(() => {
    expensesRef.current = expenses
  }, [expenses])

  const fetchData = useCallback(
    async (force: boolean = false) => {
      if (!accessToken || !client) {
        setError('Access token and GraphQL client are required.')
        setLoading(false)
        return
      }

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
        effectiveDateRange: effectiveDateRangeFilter,
        requestDateRange: requestDateRangeFilter,
        requestTypeFilter,
        orderBy
      })

      if (!force && requestKey === lastRequestKey.current) {
        return
      }

      if (!force && isLoadingRef.current) {
        return
      }

      lastRequestKey.current = requestKey
      isLoadingRef.current = true

      const showFullTableLoading = force || expensesRef.current.length === 0
      if (showFullTableLoading) {
        setLoading(true)
      }
      setError(null)

      try {
        const baseWhere = buildWhereConditions({
          statusFilter,
          employeeFilter,
          amountMinFilter,
          amountMaxFilter,
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
          orderBy: Array.isArray(orderBy) ? orderBy : [orderBy]
        }

        const response = await client.request(GET_EXPENSE_REQUESTS, variables)
        const responseData = response as ExpenseRequestQueryData

        if (responseData?.ExpenseRequest) {
          setExpenses(responseData.ExpenseRequest.map(item => mapExpenseRequest(item, t)))
        } else {
          setExpenses([])
        }

        const aggregateCount = responseData.total?.aggregate?.count
        const parsedTotal = Number(aggregateCount)
        setTotalItems(Number.isFinite(parsedTotal) ? parsedTotal : 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expense requests. Please try again later.')
        setExpenses([])
        setTotalItems(0)
      } finally {
        setLoading(false)
        isLoadingRef.current = false
      }
    },
    [
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
      effectiveDateRangeFilter,
      requestDateRangeFilter,
      requestTypeFilter,
      orderBy,
      t
    ]
  )

  useEffect(() => {
    if (accessToken && client && isActive) {
      fetchData()
    }
  }, [fetchData, isActive])

  return {
    expenses,
    totalItems,
    loading,
    error,
    fetchData
  }
}
