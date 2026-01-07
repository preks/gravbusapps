import { useCallback, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

/**
 * Simplified expense request type for the debugger
 */
export interface ExpenseRequestItem {
  id: string
  code: string
  title: string
  status: string
  totalAmount: number | null
  currencyCode: string | null
  startDate: string | null
  endDate: string | null
  requestDate: string | null
  employeeName: string | null
  employeeId: string | null
  requestType: string | null
  planCode: string | null
}

/**
 * Simplified expense plan type for the debugger
 */
export interface ExpensePlanItem {
  id: string
  code: string
  title: string
  status: string
  totalAmount: number | null
  currencyCode: string | null
  startDate: string | null
  endDate: string | null
  planDate: string | null
  employeeName: string | null
  employeeId: string | null
  requestType: string | null
  hasRequests: boolean
}

// GraphQL query for expense requests
const GET_EXPENSE_REQUESTS_FOR_DEBUG = `
  query GetExpenseRequestsForDebug(
    $where: ExpenseRequestBoolExp
    $orderBy: [ExpenseRequestOrderBy!]
    $limit: Int
    $offset: Int
  ) {
    ExpenseRequest(
      where: $where
      orderBy: $orderBy
      limit: $limit
      offset: $offset
    ) {
      id
      code
      title
      status
      totalAmount
      startDate
      endDate
      requestDate
      employeeId
      currency { code }
      employee { 
        firstName 
        lastName 
      }
      requestType { value }
      expensePlan { code }
    }
    total: ExpenseRequestAggregate(where: $where) {
      aggregate { count }
    }
  }
`

// GraphQL query for expense plans
const GET_EXPENSE_PLANS_FOR_DEBUG = `
  query GetExpensePlansForDebug(
    $where: ExpensePlanBoolExp
    $orderBy: [ExpensePlanOrderBy!]
    $limit: Int
    $offset: Int
  ) {
    ExpensePlan(
      where: $where
      orderBy: $orderBy
      limit: $limit
      offset: $offset
    ) {
      id
      code
      title
      status
      totalAmount
      startDate
      endDate
      planDate
      employeeId
      currency { code }
      employee { 
        firstName 
        lastName 
      }
      requestType { value }
      expenseRequest { id }
    }
    total: ExpensePlanAggregate(where: $where) {
      aggregate { count }
    }
  }
`

export interface ExpenseFilters {
  search?: string
  employeeId?: string
  statuses?: string[]
  dateFrom?: string
  dateTo?: string
}

interface UseExpenseDataLoaderReturn {
  requests: ExpenseRequestItem[]
  plans: ExpensePlanItem[]
  requestsTotal: number
  plansTotal: number
  loading: boolean
  error: string | null
  loadRequests: (filters?: ExpenseFilters, limit?: number) => Promise<void>
  loadPlans: (filters?: ExpenseFilters, limit?: number) => Promise<void>
  loadAll: (filters?: ExpenseFilters, limit?: number) => Promise<void>
  searchById: (id: string) => ExpenseRequestItem | ExpensePlanItem | null
}

/**
 * Hook for loading expense requests and plans for the debugger
 */
export function useExpenseDataLoader(accessToken: string): UseExpenseDataLoaderReturn {
  const [requests, setRequests] = useState<ExpenseRequestItem[]>([])
  const [plans, setPlans] = useState<ExpensePlanItem[]>([])
  const [requestsTotal, setRequestsTotal] = useState(0)
  const [plansTotal, setPlansTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const loadRequests = useCallback(
    async (filters?: ExpenseFilters, limit: number = 50) => {
      setLoading(true)
      setError(null)
      try {
        // Build where clause with filters
        const whereConditions: any[] = [{ isDeleted: { _eq: false } }]

        // Search filter
        if (filters?.search && filters.search.trim()) {
          const searchTerm = filters.search.trim()
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm)
          if (isUuid) {
            whereConditions.push({ id: { _eq: searchTerm } })
          } else {
            whereConditions.push({
              _or: [{ code: { _ilike: `%${searchTerm}%` } }, { title: { _ilike: `%${searchTerm}%` } }]
            })
          }
        }

        // Employee filter
        if (filters?.employeeId) {
          whereConditions.push({ employeeId: { _eq: filters.employeeId } })
        }

        // Status filter (multiselect)
        if (filters?.statuses && filters.statuses.length > 0) {
          whereConditions.push({ status: { _in: filters.statuses } })
        }

        // Date range filters
        if (filters?.dateFrom) {
          whereConditions.push({ startDate: { _gte: filters.dateFrom } })
        }
        if (filters?.dateTo) {
          whereConditions.push({ endDate: { _lte: filters.dateTo } })
        }

        const where = whereConditions.length > 1 ? { _and: whereConditions } : whereConditions[0]

        const data = await graphQLClient.request(GET_EXPENSE_REQUESTS_FOR_DEBUG, {
          where,
          orderBy: [{ createdAt: 'DESC' }],
          limit,
          offset: 0
        })

        const mappedRequests: ExpenseRequestItem[] = (data.ExpenseRequest || []).map((req: any) => ({
          id: req.id,
          code: req.code || '',
          title: req.title || '',
          status: req.status || '',
          totalAmount: req.totalAmount,
          currencyCode: req.currency?.code || null,
          startDate: req.startDate,
          endDate: req.endDate,
          requestDate: req.requestDate,
          employeeName: req.employee ? `${req.employee.firstName || ''} ${req.employee.lastName || ''}`.trim() : null,
          employeeId: req.employeeId,
          requestType: req.requestType?.value || null,
          planCode: req.expensePlan?.code || null
        }))

        setRequests(mappedRequests)
        setRequestsTotal(data.total?.aggregate?.count || mappedRequests.length)
      } catch (err) {
        console.error('Error loading expense requests:', err)
        setError(err instanceof Error ? err.message : 'Failed to load expense requests')
      } finally {
        setLoading(false)
      }
    },
    [graphQLClient]
  )

  const loadPlans = useCallback(
    async (filters?: ExpenseFilters, limit: number = 50) => {
      setLoading(true)
      setError(null)
      try {
        // Build where clause with filters
        const whereConditions: any[] = [{ isDeleted: { _eq: false } }]

        // Search filter
        if (filters?.search && filters.search.trim()) {
          const searchTerm = filters.search.trim()
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm)
          if (isUuid) {
            whereConditions.push({ id: { _eq: searchTerm } })
          } else {
            whereConditions.push({
              _or: [{ code: { _ilike: `%${searchTerm}%` } }, { title: { _ilike: `%${searchTerm}%` } }]
            })
          }
        }

        // Employee filter
        if (filters?.employeeId) {
          whereConditions.push({ employeeId: { _eq: filters.employeeId } })
        }

        // Status filter (multiselect)
        if (filters?.statuses && filters.statuses.length > 0) {
          whereConditions.push({ status: { _in: filters.statuses } })
        }

        // Date range filters
        if (filters?.dateFrom) {
          whereConditions.push({ startDate: { _gte: filters.dateFrom } })
        }
        if (filters?.dateTo) {
          whereConditions.push({ endDate: { _lte: filters.dateTo } })
        }

        const where = whereConditions.length > 1 ? { _and: whereConditions } : whereConditions[0]

        const data = await graphQLClient.request(GET_EXPENSE_PLANS_FOR_DEBUG, {
          where,
          orderBy: [{ createdAt: 'DESC' }],
          limit,
          offset: 0
        })

        const mappedPlans: ExpensePlanItem[] = (data.ExpensePlan || []).map((plan: any) => ({
          id: plan.id,
          code: plan.code || '',
          title: plan.title || '',
          status: plan.status || '',
          totalAmount: plan.totalAmount,
          currencyCode: plan.currency?.code || null,
          startDate: plan.startDate,
          endDate: plan.endDate,
          planDate: plan.planDate,
          employeeName: plan.employee
            ? `${plan.employee.firstName || ''} ${plan.employee.lastName || ''}`.trim()
            : null,
          employeeId: plan.employeeId,
          requestType: plan.requestType?.value || null,
          hasRequests: (plan.expenseRequest?.length || 0) > 0
        }))

        setPlans(mappedPlans)
        setPlansTotal(data.total?.aggregate?.count || mappedPlans.length)
      } catch (err) {
        console.error('Error loading expense plans:', err)
        setError(err instanceof Error ? err.message : 'Failed to load expense plans')
      } finally {
        setLoading(false)
      }
    },
    [graphQLClient]
  )

  const loadAll = useCallback(
    async (filters?: ExpenseFilters, limit: number = 50) => {
      setLoading(true)
      setError(null)
      try {
        await Promise.all([loadRequests(filters, limit), loadPlans(filters, limit)])
      } catch (err) {
        console.error('Error loading expense data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load expense data')
      } finally {
        setLoading(false)
      }
    },
    [loadRequests, loadPlans]
  )

  const searchById = useCallback(
    (id: string): ExpenseRequestItem | ExpensePlanItem | null => {
      const request = requests.find(r => r.id === id || r.code === id)
      if (request) return request

      const plan = plans.find(p => p.id === id || p.code === id)
      if (plan) return plan

      return null
    },
    [requests, plans]
  )

  return {
    requests,
    plans,
    requestsTotal,
    plansTotal,
    loading,
    error,
    loadRequests,
    loadPlans,
    loadAll,
    searchById
  }
}
